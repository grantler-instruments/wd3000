use rosc::{OscMessage, OscPacket, OscType};
use serde::Serialize;
use serde_json::{json, Value};
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OscInputMessage {
    pub address: String,
    pub value: f32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OscDebugArg {
    #[serde(rename = "type")]
    pub arg_type: String,
    pub value: Option<Value>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OscDebugMessage {
    pub summary: String,
    pub address: String,
    pub args: Vec<OscDebugArg>,
}

pub struct OscListenerState {
    inner: Mutex<OscListenerInner>,
}

struct OscListenerInner {
    stop_flag: Option<Arc<AtomicBool>>,
    handle: Option<JoinHandle<()>>,
}

impl OscListenerState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(OscListenerInner {
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
            let bind_addr = format!("0.0.0.0:{port}");
            let socket = match UdpSocket::bind(&bind_addr) {
                Ok(socket) => socket,
                Err(error) => {
                    let _ = app_handle.emit(
                        "control-input-error",
                        format!("Failed to bind OSC listener on port {port}: {error}"),
                    );
                    return;
                }
            };

            let _ = socket.set_read_timeout(Some(Duration::from_millis(250)));

            let mut buffer = [0_u8; 1024];
            while !listener_stop.load(Ordering::Relaxed) {
                match socket.recv_from(&mut buffer) {
                    Ok((size, _)) => {
                        if let Ok((_, packet)) = rosc::decoder::decode_udp(&buffer[..size]) {
                            emit_osc_packet(&app_handle, packet);
                        }
                    }
                    Err(error)
                        if error.kind() == std::io::ErrorKind::WouldBlock
                            || error.kind() == std::io::ErrorKind::TimedOut =>
                    {
                        continue;
                    }
                    Err(_) => break,
                }
            }
        });

        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        inner.stop_flag = Some(stop_flag);
        inner.handle = Some(handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        if let Some(stop_flag) = inner.stop_flag.take() {
            stop_flag.store(true, Ordering::Relaxed);
        }
        if let Some(handle) = inner.handle.take() {
            let _ = handle.join();
        }
        Ok(())
    }
}

fn emit_osc_packet(app: &AppHandle, packet: OscPacket) {
    match packet {
        OscPacket::Message(message) => emit_osc_message(app, message),
        OscPacket::Bundle(bundle) => {
            for content in bundle.content {
                emit_osc_packet(app, content);
            }
        }
    }
}

fn emit_osc_debug(app: &AppHandle, message: &OscMessage) {
    let _ = app.emit(
        "osc-debug-message",
        OscDebugMessage {
            summary: format_osc_message_summary(message),
            address: message.addr.clone(),
            args: message
                .args
                .iter()
                .filter_map(osc_type_to_debug_arg)
                .collect(),
        },
    );
}

fn osc_type_to_debug_arg(arg: &OscType) -> Option<OscDebugArg> {
    match arg {
        OscType::Int(value) => Some(OscDebugArg {
            arg_type: "int".to_string(),
            value: Some(json!(*value)),
        }),
        OscType::Float(value) => Some(OscDebugArg {
            arg_type: "float".to_string(),
            value: Some(json!(*value)),
        }),
        OscType::String(value) => Some(OscDebugArg {
            arg_type: "string".to_string(),
            value: Some(json!(value)),
        }),
        OscType::Bool(true) => Some(OscDebugArg {
            arg_type: "true".to_string(),
            value: None,
        }),
        OscType::Bool(false) => Some(OscDebugArg {
            arg_type: "false".to_string(),
            value: None,
        }),
        _ => None,
    }
}

fn osc_type_tag(arg: &OscType) -> &'static str {
    match arg {
        OscType::Int(_) => "i",
        OscType::Float(_) => "f",
        OscType::Double(_) => "d",
        OscType::Long(_) => "h",
        OscType::String(_) => "s",
        OscType::Bool(true) => "T",
        OscType::Bool(false) => "F",
        OscType::Blob(_) => "b",
        OscType::Time(_) => "t",
        OscType::Char(_) => "c",
        OscType::Color(_) => "r",
        OscType::Midi(_) => "m",
        _ => "?",
    }
}

fn format_osc_arg_value(arg: &OscType) -> Option<String> {
    match arg {
        OscType::Int(value) => Some(value.to_string()),
        OscType::Float(value) => Some(value.to_string()),
        OscType::Double(value) => Some(value.to_string()),
        OscType::Long(value) => Some(value.to_string()),
        OscType::String(value) => Some(format!("\"{value}\"")),
        OscType::Bool(_) => None,
        OscType::Blob(bytes) => Some(format!("<blob {} bytes>", bytes.len())),
        OscType::Time(time) => Some(format!("@{}:{}", time.seconds, time.fractional)),
        OscType::Midi(midi) => Some(format!(
            "midi(port={},status={},data1={},data2={})",
            midi.port, midi.status, midi.data1, midi.data2
        )),
        OscType::Color(color) => Some(format!(
            "color(r={},g={},b={},a={})",
            color.red, color.green, color.blue, color.alpha
        )),
        OscType::Char(value) => Some(format!("'{value}'")),
        _ => Some("?".to_string()),
    }
}

fn format_osc_message_summary(message: &OscMessage) -> String {
    if message.args.is_empty() {
        return message.addr.clone();
    }

    let tags: String = message.args.iter().map(osc_type_tag).collect();
    let values: Vec<String> = message
        .args
        .iter()
        .filter_map(format_osc_arg_value)
        .collect();

    if values.is_empty() {
        format!("{} [{}]", message.addr, tags)
    } else {
        format!("{} [{}] {}", message.addr, tags, values.join(", "))
    }
}

fn emit_osc_message(app: &AppHandle, message: OscMessage) {
    emit_osc_debug(app, &message);

    if let Some(value) = osc_message_value(&message) {
        let _ = app.emit(
            "control-input-osc",
            OscInputMessage {
                address: message.addr,
                value,
            },
        );
    }
}

fn osc_message_value(message: &OscMessage) -> Option<f32> {
    message.args.first().and_then(|arg| match arg {
        OscType::Float(value) => Some(*value),
        OscType::Double(value) => Some(*value as f32),
        OscType::Int(value) => Some(*value as f32),
        OscType::Long(value) => Some(*value as f32),
        OscType::Bool(value) => Some(if *value { 1.0 } else { 0.0 }),
        _ => None,
    })
}

#[tauri::command]
pub fn start_osc_listener(
    app: AppHandle,
    state: State<'_, OscListenerState>,
    port: u16,
) -> Result<(), String> {
    if port == 0 {
        return state.stop();
    }

    state.start(app, port)
}

#[tauri::command]
pub fn stop_osc_listener(state: State<'_, OscListenerState>) -> Result<(), String> {
    state.stop()
}
