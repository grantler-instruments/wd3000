use rosc::OscPacket;
use serde::Serialize;
use std::collections::HashMap;
use std::io;
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tuioxide::core::osc_receiver::OscReceiver;
use tuioxide::tuio11::{
    BlobEvent, Client as Tuio11Client, CursorEvent, ObjectEvent, TuioEvents as Tuio11Events,
};
use tuioxide::tuio20::{
    BoundsEvent, Client as Tuio20Client, PointerEvent, SymbolEvent, TokenEvent,
    TuioEvents as Tuio20Events,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuioEntity {
    pub kind: String,
    pub session_id: i32,
    pub x: Option<f32>,
    pub y: Option<f32>,
    pub angle: Option<f32>,
    pub width: Option<f32>,
    pub height: Option<f32>,
    pub radius: Option<f32>,
    pub class_id: Option<i32>,
    pub type_user_id: Option<i32>,
    pub component_id: Option<i32>,
    pub area: Option<f32>,
    pub pressure: Option<f32>,
    pub group: Option<String>,
    pub data: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuioFrame {
    pub frame: i32,
    pub entities: Vec<TuioEntity>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuioDebugMessage {
    pub summary: String,
}

pub struct TuioListenerState {
    inner: Mutex<TuioListenerInner>,
}

struct TuioListenerInner {
    stop_flag: Option<Arc<AtomicBool>>,
    handle: Option<JoinHandle<()>>,
}

struct ChannelReceiver {
    rx: Receiver<OscPacket>,
}

impl OscReceiver for ChannelReceiver {
    fn recv(&mut self) -> Result<OscPacket, io::Error> {
        self.rx.recv().map_err(|_| {
            io::Error::new(io::ErrorKind::BrokenPipe, "TUIO packet channel closed")
        })
    }
}

struct MonitorState {
    entities: HashMap<String, TuioEntity>,
    frame: i32,
    dirty: bool,
}

impl MonitorState {
    fn new() -> Self {
        Self {
            entities: HashMap::new(),
            frame: 0,
            dirty: false,
        }
    }

    fn upsert(&mut self, entity: TuioEntity) {
        let key = format!("{}:{}", entity.kind, entity.session_id);
        self.entities.insert(key, entity);
        self.dirty = true;
    }

    fn remove(&mut self, kind: &str, session_id: i32) {
        let key = format!("{kind}:{session_id}");
        if self.entities.remove(&key).is_some() {
            self.dirty = true;
        }
    }

    fn frame_snapshot(&self) -> TuioFrame {
        let mut entities: Vec<TuioEntity> = self.entities.values().cloned().collect();
        entities.sort_by(|left, right| {
            left.kind
                .cmp(&right.kind)
                .then(left.session_id.cmp(&right.session_id))
        });
        TuioFrame {
            frame: self.frame,
            entities,
        }
    }
}

impl TuioListenerState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(TuioListenerInner {
                stop_flag: None,
                handle: None,
            }),
        }
    }

    pub fn start(&self, app: AppHandle, port: u16) -> Result<(), String> {
        self.stop()?;

        let stop_flag = Arc::new(AtomicBool::new(false));
        let listener_stop = Arc::clone(&stop_flag);
        let app_handle = app.clone();

        let handle = thread::spawn(move || {
            run_listener(app_handle, port, listener_stop);
        });

        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        inner.stop_flag = Some(stop_flag);
        inner.handle = Some(handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        if let Some(stop_flag) = inner.stop_flag.take() {
            stop_flag.store(true, Ordering::Relaxed);
        }
        if let Some(handle) = inner.handle.take() {
            let _ = handle.join();
        }
        Ok(())
    }
}

fn run_listener(app: AppHandle, port: u16, stop_flag: Arc<AtomicBool>) {
    let bind_addr = format!("0.0.0.0:{port}");
    let socket = match UdpSocket::bind(&bind_addr) {
        Ok(socket) => socket,
        Err(error) => {
            let _ = app.emit(
                "control-input-error",
                format!("Failed to bind TUIO listener on port {port}: {error}"),
            );
            return;
        }
    };

    if socket.set_read_timeout(Some(Duration::from_millis(50))).is_err() {
        return;
    }

    let (packet_tx11, packet_rx11) = mpsc::channel::<OscPacket>();
    let (packet_tx20, packet_rx20) = mpsc::channel::<OscPacket>();
    let events11 = Tuio11Client::spawn(ChannelReceiver { rx: packet_rx11 });
    let events20 = Tuio20Client::spawn(ChannelReceiver { rx: packet_rx20 });

    let udp_stop = Arc::clone(&stop_flag);
    let udp_socket = match socket.try_clone() {
        Ok(socket) => socket,
        Err(_) => return,
    };

    let udp_handle = thread::spawn(move || {
        let mut buffer = [0_u8; rosc::decoder::MTU];
        while !udp_stop.load(Ordering::Relaxed) {
            match udp_socket.recv(&mut buffer) {
                Ok(size) => {
                    if let Ok((_, packet)) = rosc::decoder::decode_udp(&buffer[..size]) {
                        let _ = packet_tx11.send(packet.clone());
                        let _ = packet_tx20.send(packet);
                    }
                }
                Err(error)
                    if error.kind() == io::ErrorKind::WouldBlock
                        || error.kind() == io::ErrorKind::TimedOut =>
                {
                    continue;
                }
                Err(_) => break,
            }
        }
    });

    let mut state = MonitorState::new();

    while !stop_flag.load(Ordering::Relaxed) {
        let mut frame_advanced = false;

        while let Ok(events) = events11.try_recv() {
            frame_advanced = true;
            apply_tuio11_events(&app, &mut state, events);
        }

        while let Ok(events) = events20.try_recv() {
            frame_advanced = true;
            apply_tuio20_events(&app, &mut state, events);
        }

        if frame_advanced {
            state.frame += 1;
        }

        if state.dirty {
            state.dirty = false;
            let _ = app.emit("tuio-frame", state.frame_snapshot());
        }

        thread::sleep(Duration::from_millis(16));
    }

    drop(events11);
    drop(events20);
    let _ = udp_handle.join();
    let _ = app.emit(
        "tuio-frame",
        TuioFrame {
            frame: 0,
            entities: Vec::new(),
        },
    );
}

fn emit_debug(app: &AppHandle, summary: String) {
    let _ = app.emit("tuio-debug-message", TuioDebugMessage { summary });
}

fn apply_tuio11_events(app: &AppHandle, state: &mut MonitorState, events: Tuio11Events) {
    for event in events.cursor_events {
        match event {
            CursorEvent::Add(cursor) | CursorEvent::Update(cursor) => {
                let position = cursor.position();
                state.upsert(TuioEntity {
                    kind: "cursor".into(),
                    session_id: cursor.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: None,
                    width: None,
                    height: None,
                    radius: None,
                    class_id: None,
                    type_user_id: None,
                    component_id: None,
                    area: None,
                    pressure: None,
                    group: None,
                    data: None,
                });
            }
            CursorEvent::Remove(cursor) => {
                emit_debug(
                    app,
                    format!("cursor {} removed", cursor.session_id()),
                );
                state.remove("cursor", cursor.session_id());
            }
        }
    }

    for event in events.object_events {
        match event {
            ObjectEvent::Add(object) | ObjectEvent::Update(object) => {
                let position = object.position();
                state.upsert(TuioEntity {
                    kind: "object".into(),
                    session_id: object.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: Some(object.angle()),
                    width: None,
                    height: None,
                    radius: None,
                    class_id: Some(object.class_id()),
                    type_user_id: None,
                    component_id: None,
                    area: None,
                    pressure: None,
                    group: None,
                    data: None,
                });
            }
            ObjectEvent::Remove(object) => {
                emit_debug(
                    app,
                    format!("object {} removed", object.session_id()),
                );
                state.remove("object", object.session_id());
            }
        }
    }

    for event in events.blob_events {
        match event {
            BlobEvent::Add(blob) | BlobEvent::Update(blob) => {
                let position = blob.position();
                let size = blob.size();
                state.upsert(TuioEntity {
                    kind: "blob".into(),
                    session_id: blob.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: Some(blob.angle()),
                    width: Some(size.width),
                    height: Some(size.height),
                    radius: None,
                    class_id: None,
                    type_user_id: None,
                    component_id: None,
                    area: Some(blob.area()),
                    pressure: None,
                    group: None,
                    data: None,
                });
            }
            BlobEvent::Remove(blob) => {
                emit_debug(app, format!("blob {} removed", blob.session_id()));
                state.remove("blob", blob.session_id());
            }
        }
    }
}

fn apply_tuio20_events(app: &AppHandle, state: &mut MonitorState, events: Tuio20Events) {
    for event in events.pointer_events {
        match event {
            PointerEvent::Add(pointer) | PointerEvent::Update(pointer) => {
                let position = pointer.position();
                state.upsert(TuioEntity {
                    kind: "pointer".into(),
                    session_id: pointer.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: Some(pointer.angle()),
                    width: None,
                    height: None,
                    radius: Some(pointer.radius()),
                    class_id: None,
                    type_user_id: Some(pointer.type_user_id()),
                    component_id: Some(pointer.component_id()),
                    area: None,
                    pressure: Some(pointer.pressure()),
                    group: None,
                    data: None,
                });
            }
            PointerEvent::Remove(pointer) => {
                emit_debug(
                    app,
                    format!("pointer {} removed", pointer.session_id()),
                );
                state.remove("pointer", pointer.session_id());
            }
        }
    }

    for event in events.token_events {
        match event {
            TokenEvent::Add(token) | TokenEvent::Update(token) => {
                let position = token.position();
                state.upsert(TuioEntity {
                    kind: "token".into(),
                    session_id: token.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: Some(token.angle()),
                    width: None,
                    height: None,
                    radius: None,
                    class_id: None,
                    type_user_id: Some(token.type_user_id()),
                    component_id: Some(token.component_id()),
                    area: None,
                    pressure: None,
                    group: None,
                    data: None,
                });
            }
            TokenEvent::Remove(token) => {
                emit_debug(app, format!("token {} removed", token.session_id()));
                state.remove("token", token.session_id());
            }
        }
    }

    for event in events.bounds_events {
        match event {
            BoundsEvent::Add(bounds) | BoundsEvent::Update(bounds) => {
                let position = bounds.position();
                let size = bounds.size();
                state.upsert(TuioEntity {
                    kind: "bounds".into(),
                    session_id: bounds.session_id(),
                    x: Some(position.x),
                    y: Some(position.y),
                    angle: Some(bounds.angle()),
                    width: Some(size.width),
                    height: Some(size.height),
                    radius: None,
                    class_id: None,
                    type_user_id: None,
                    component_id: None,
                    area: Some(bounds.area()),
                    pressure: None,
                    group: None,
                    data: None,
                });
            }
            BoundsEvent::Remove(bounds) => {
                emit_debug(
                    app,
                    format!("bounds {} removed", bounds.session_id()),
                );
                state.remove("bounds", bounds.session_id());
            }
        }
    }

    for event in events.symbol_events {
        match event {
            SymbolEvent::Add(symbol) | SymbolEvent::Update(symbol) => {
                state.upsert(TuioEntity {
                    kind: "symbol".into(),
                    session_id: symbol.session_id(),
                    x: None,
                    y: None,
                    angle: None,
                    width: None,
                    height: None,
                    radius: None,
                    class_id: None,
                    type_user_id: Some(symbol.type_user_id()),
                    component_id: Some(symbol.component_id()),
                    area: None,
                    pressure: None,
                    group: Some(symbol.group().to_string()),
                    data: Some(symbol.data().to_string()),
                });
            }
            SymbolEvent::Remove(symbol) => {
                emit_debug(
                    app,
                    format!("symbol {} removed", symbol.session_id()),
                );
                state.remove("symbol", symbol.session_id());
            }
        }
    }
}

#[tauri::command]
pub fn start_tuio_listener(
    app: AppHandle,
    state: State<'_, TuioListenerState>,
    port: u16,
) -> Result<(), String> {
    if port == 0 {
        return state.stop();
    }

    state.start(app, port)
}

#[tauri::command]
pub fn stop_tuio_listener(state: State<'_, TuioListenerState>) -> Result<(), String> {
    state.stop()
}
