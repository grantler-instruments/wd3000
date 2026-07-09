use crate::artnet::{format_artdmx_summary, parse_artdmx};
use serde::Serialize;
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtNetDebugMessage {
    pub summary: String,
    pub universe: u16,
    pub sequence: u8,
    pub physical: u8,
    pub channel_count: u16,
    pub channels: Vec<u8>,
}

pub struct ArtNetListenerState {
    inner: Mutex<ArtNetListenerInner>,
}

struct ArtNetListenerInner {
    stop_flag: Option<Arc<AtomicBool>>,
    handle: Option<JoinHandle<()>>,
    active_port: Option<u16>,
}

impl ArtNetListenerState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(ArtNetListenerInner {
                stop_flag: None,
                handle: None,
                active_port: None,
            }),
        }
    }

    pub fn start(&self, app: AppHandle, port: u16) -> Result<(), String> {
        self.stop()?;

        let bind_addr = format!("0.0.0.0:{port}");
        let socket = UdpSocket::bind(&bind_addr).map_err(|error| {
            format!("Failed to bind Art-Net listener on port {port}: {error}")
        })?;

        socket
            .set_read_timeout(Some(Duration::from_millis(250)))
            .map_err(|error| error.to_string())?;

        let stop_flag = Arc::new(AtomicBool::new(false));
        let listener_stop = Arc::clone(&stop_flag);
        let app_handle = app.clone();

        let handle = thread::spawn(move || {
            let mut buffer = [0_u8; 1024];
            while !listener_stop.load(Ordering::Relaxed) {
                match socket.recv_from(&mut buffer) {
                    Ok((size, _)) => {
                        if let Some(packet) = parse_artdmx(&buffer[..size]) {
                            let _ = app_handle.emit(
                                "artnet-debug-message",
                                ArtNetDebugMessage {
                                    summary: format_artdmx_summary(&packet),
                                    universe: packet.universe,
                                    sequence: packet.sequence,
                                    physical: packet.physical,
                                    channel_count: packet.channels.len() as u16,
                                    channels: packet.channels,
                                },
                            );
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
        inner.active_port = Some(port);
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
        inner.active_port = None;
        Ok(())
    }

    pub fn status(&self) -> ArtNetListenerStatus {
        let inner = self.inner.lock().ok();
        match inner {
            Some(inner) => ArtNetListenerStatus {
                listening: inner.active_port.is_some(),
                port: inner.active_port,
            },
            None => ArtNetListenerStatus {
                listening: false,
                port: None,
            },
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtNetListenerStatus {
    pub listening: bool,
    pub port: Option<u16>,
}

#[tauri::command]
pub fn start_artnet_listener(
    app: AppHandle,
    state: State<'_, ArtNetListenerState>,
    port: u16,
) -> Result<(), String> {
    if port == 0 {
        return state.stop();
    }

    state.start(app, port)
}

#[tauri::command]
pub fn stop_artnet_listener(state: State<'_, ArtNetListenerState>) -> Result<(), String> {
    state.stop()
}

#[tauri::command]
pub fn get_artnet_listener_status(
    state: State<'_, ArtNetListenerState>,
) -> Result<ArtNetListenerStatus, String> {
    Ok(state.status())
}
