use rosc::{OscBundle, OscMessage, OscPacket, OscTime, OscType};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter, State};

use crate::tuio_listen::TuioDebugMessage;

const TUIO_CURSOR_ADDRESS: &str = "/tuio/2Dcur";
const TUIO_SOURCE: &str = "wd3000";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TuioCursorInput {
    pub session_id: i32,
    pub x: f32,
    pub y: f32,
}

struct CursorState {
    x: f32,
    y: f32,
    velocity_x: f32,
    velocity_y: f32,
}

pub struct TuioSenderState {
    inner: Mutex<TuioSenderInner>,
}

struct TuioSenderInner {
    cursors: HashMap<i32, CursorState>,
    frame_id: i32,
}

impl TuioSenderState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(TuioSenderInner {
                cursors: HashMap::new(),
                frame_id: 0,
            }),
        }
    }

    pub fn send_cursors(
        &self,
        host: &str,
        port: u16,
        cursors: &[TuioCursorInput],
    ) -> Result<i32, String> {
        let mut inner = self.inner.lock().map_err(|error| error.to_string())?;
        let active_ids: Vec<i32> = cursors.iter().map(|cursor| cursor.session_id).collect();
        inner.cursors.retain(|session_id, _| active_ids.contains(session_id));

        for cursor in cursors {
            let (velocity_x, velocity_y) = match inner.cursors.get(&cursor.session_id) {
                Some(previous) => (cursor.x - previous.x, cursor.y - previous.y),
                None => (0.0, 0.0),
            };

            inner.cursors.insert(
                cursor.session_id,
                CursorState {
                    x: cursor.x,
                    y: cursor.y,
                    velocity_x,
                    velocity_y,
                },
            );
        }

        inner.frame_id += 1;
        let frame_id = inner.frame_id;
        let bundle = build_cursor_bundle(&inner.cursors, frame_id);
        send_bundle(host, port, &bundle)?;

        Ok(frame_id)
    }
}

fn build_cursor_bundle(cursors: &HashMap<i32, CursorState>, frame_id: i32) -> OscBundle {
    let alive_args = cursors
        .keys()
        .copied()
        .map(OscType::Int)
        .collect::<Vec<_>>();

    let mut content = vec![
        OscPacket::Message(OscMessage {
            addr: TUIO_CURSOR_ADDRESS.to_string(),
            args: std::iter::once(OscType::String("alive".into()))
                .chain(alive_args)
                .collect(),
        }),
        OscPacket::Message(OscMessage {
            addr: TUIO_CURSOR_ADDRESS.to_string(),
            args: vec![
                OscType::String("source".into()),
                OscType::String(TUIO_SOURCE.into()),
            ],
        }),
    ];

    let mut session_ids = cursors.keys().copied().collect::<Vec<_>>();
    session_ids.sort_unstable();

    for session_id in session_ids {
        let Some(cursor) = cursors.get(&session_id) else {
            continue;
        };

        content.push(OscPacket::Message(OscMessage {
            addr: TUIO_CURSOR_ADDRESS.to_string(),
            args: vec![
                OscType::String("set".into()),
                OscType::Int(session_id),
                OscType::Float(cursor.x),
                OscType::Float(cursor.y),
                OscType::Float(cursor.velocity_x),
                OscType::Float(cursor.velocity_y),
                OscType::Float(0.0),
            ],
        }));
    }

    content.push(OscPacket::Message(OscMessage {
        addr: TUIO_CURSOR_ADDRESS.to_string(),
        args: vec![
            OscType::String("fseq".into()),
            OscType::Int(frame_id),
        ],
    }));

    OscBundle {
        timetag: OscTime::try_from(SystemTime::now()).unwrap_or(OscTime {
            seconds: 0,
            fractional: 0,
        }),
        content,
    }
}

fn send_bundle(host: &str, port: u16, bundle: &OscBundle) -> Result<(), String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|error| error.to_string())?;
    let target = format!("{host}:{port}");
    let packet = OscPacket::Bundle(bundle.clone());
    let buffer = rosc::encoder::encode(&packet).map_err(|error| error.to_string())?;
    socket
        .send_to(&buffer, target)
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn send_tuio_cursors(
    app: AppHandle,
    state: State<'_, TuioSenderState>,
    host: String,
    port: u16,
    cursors: Vec<TuioCursorInput>,
) -> Result<(), String> {
    if host.trim().is_empty() {
        return Err("TUIO send host is required.".into());
    }

    if port == 0 {
        return Err("TUIO send port must be greater than 0.".into());
    }

    let frame_id = state.send_cursors(host.trim(), port, &cursors)?;
    let cursor_summary = if cursors.is_empty() {
        "no cursors".to_string()
    } else {
        cursors
            .iter()
            .map(|cursor| {
                format!(
                    "#{} ({:.3}, {:.3})",
                    cursor.session_id, cursor.x, cursor.y
                )
            })
            .collect::<Vec<_>>()
            .join(", ")
    };

    let _ = app.emit(
        "tuio-debug-message",
        TuioDebugMessage {
            summary: format!("OUT /tuio/2Dcur fseq={frame_id} → {cursor_summary}"),
        },
    );

    Ok(())
}
