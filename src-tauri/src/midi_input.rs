use midir::{Ignore, MidiInput};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiNoteInputMessage {
    pub channel: u8,
    pub note: u8,
    pub velocity: u8,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiCcInputMessage {
    pub channel: u8,
    pub cc: u8,
    pub value: u8,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiDebugMessage {
    pub kind: String,
    pub summary: String,
    pub bytes: Vec<u8>,
}

pub struct MidiInputState {
    connection: Mutex<Option<MidiInputConnection>>,
}

struct MidiInputConnection {
    _conn: midir::MidiInputConnection<()>,
}

impl MidiInputState {
    pub fn new() -> Self {
        Self {
            connection: Mutex::new(None),
        }
    }

    pub fn list_inputs() -> Result<Vec<String>, String> {
        let midi_in = MidiInput::new("wd3000-input").map_err(|e| e.to_string())?;
        Ok(midi_in
            .ports()
            .iter()
            .map(|port| {
                midi_in
                    .port_name(port)
                    .unwrap_or_else(|_| "Unknown".to_string())
            })
            .collect())
    }

    pub fn start(&self, app: AppHandle, port_name: &str) -> Result<(), String> {
        self.stop()?;

        let mut midi_in = MidiInput::new("wd3000-input").map_err(|e| e.to_string())?;
        midi_in.ignore(Ignore::None);

        let port = midi_in
            .ports()
            .into_iter()
            .find(|port| midi_in.port_name(port).unwrap_or_default() == port_name)
            .ok_or_else(|| format!("MIDI input port not found: {port_name}"))?;

        let app_handle = app.clone();
        let conn = midi_in
            .connect(
                &port,
                "wd3000-input",
                move |_timestamp, message, _| {
                    parse_and_emit(&app_handle, message);
                },
                (),
            )
            .map_err(|e| e.to_string())?;

        *self.connection.lock().map_err(|e| e.to_string())? = Some(MidiInputConnection { _conn: conn });

        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        *self.connection.lock().map_err(|e| e.to_string())? = None;
        Ok(())
    }
}

fn format_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

fn emit_debug(app: &AppHandle, kind: &str, summary: String, bytes: &[u8]) {
    let _ = app.emit(
        "midi-debug-message",
        MidiDebugMessage {
            kind: kind.to_string(),
            summary,
            bytes: bytes.to_vec(),
        },
    );
}

fn emit_note(app: &AppHandle, channel: u8, note: u8, velocity: u8, bytes: &[u8]) {
    let _ = app.emit(
        "control-input-midi-note",
        MidiNoteInputMessage {
            channel,
            note,
            velocity,
        },
    );

    let summary = if velocity == 0 {
        format!("Ch{channel} Note Off {note} vel 0")
    } else {
        format!("Ch{channel} Note On {note} vel {velocity}")
    };
    emit_debug(app, "midi-note", summary, bytes);
}

fn emit_cc(app: &AppHandle, channel: u8, cc: u8, value: u8, bytes: &[u8]) {
    let _ = app.emit(
        "control-input-midi-cc",
        MidiCcInputMessage { channel, cc, value },
    );
    emit_debug(
        app,
        "midi-cc",
        format!("Ch{channel} CC{cc} → {value}"),
        bytes,
    );
}

fn parse_and_emit(app: &AppHandle, message: &[u8]) {
    if message.is_empty() {
        return;
    }

    let status = message[0];

    if status >= 0xF0 {
        match status {
            0xF0 => emit_debug(
                app,
                "midi-sysex",
                format!("SysEx {}", format_hex(message)),
                message,
            ),
            0xF1 if message.len() >= 2 => {
                emit_debug(
                    app,
                    "midi-mtc",
                    format!("MTC Quarter Frame {}", message[1]),
                    message,
                );
            }
            0xF2 if message.len() >= 3 => {
                let position = u16::from(message[2]) << 7 | u16::from(message[1]);
                emit_debug(
                    app,
                    "midi-song-position",
                    format!("Song Position {position}"),
                    message,
                );
            }
            0xF3 if message.len() >= 2 => {
                emit_debug(
                    app,
                    "midi-song-select",
                    format!("Song Select {}", message[1]),
                    message,
                );
            }
            0xF6 => emit_debug(app, "midi-tune-request", "Tune Request".to_string(), message),
            0xF7 => emit_debug(app, "midi-sysex-end", "SysEx End".to_string(), message),
            0xF8 => emit_debug(app, "midi-timing-clock", "Timing Clock".to_string(), message),
            0xFA => emit_debug(app, "midi-start", "Start".to_string(), message),
            0xFB => emit_debug(app, "midi-continue", "Continue".to_string(), message),
            0xFC => emit_debug(app, "midi-stop", "Stop".to_string(), message),
            0xFE => emit_debug(app, "midi-active-sensing", "Active Sensing".to_string(), message),
            0xFF => emit_debug(app, "midi-system-reset", "System Reset".to_string(), message),
            _ => emit_debug(app, "midi-raw", format!("Raw {}", format_hex(message)), message),
        }
        return;
    }

    let message_type = status & 0xF0;
    let channel = (status & 0x0F) + 1;

    match message_type {
        0x80 if message.len() >= 3 => {
            emit_note(app, channel, message[1], message[2], message);
        }
        0x90 if message.len() >= 3 => {
            let velocity = message[2];
            if velocity == 0 {
                emit_note(app, channel, message[1], 0, message);
            } else {
                emit_note(app, channel, message[1], velocity, message);
            }
        }
        0xA0 if message.len() >= 3 => {
            emit_debug(
                app,
                "midi-poly-pressure",
                format!(
                    "Ch{channel} Note {} pressure {}",
                    message[1], message[2]
                ),
                message,
            );
        }
        0xB0 if message.len() >= 3 => {
            emit_cc(app, channel, message[1], message[2], message);
        }
        0xC0 if message.len() >= 2 => {
            emit_debug(
                app,
                "midi-pc",
                format!("Ch{channel} Program {}", message[1]),
                message,
            );
        }
        0xD0 if message.len() >= 2 => {
            emit_debug(
                app,
                "midi-pressure",
                format!("Ch{channel} Pressure {}", message[1]),
                message,
            );
        }
        0xE0 if message.len() >= 3 => {
            let value = u16::from(message[2]) << 7 | u16::from(message[1]);
            emit_debug(
                app,
                "midi-pitch-bend",
                format!("Ch{channel} Pitch Bend {value}"),
                message,
            );
        }
        _ => emit_debug(app, "midi-raw", format!("Raw {}", format_hex(message)), message),
    }
}

#[tauri::command]
pub fn list_midi_inputs() -> Result<Vec<String>, String> {
    MidiInputState::list_inputs()
}

#[tauri::command]
pub fn start_midi_input(
    app: AppHandle,
    state: State<'_, MidiInputState>,
    port_name: Option<String>,
) -> Result<(), String> {
    match port_name {
        Some(name) if !name.is_empty() => state.start(app, name.trim()),
        _ => state.stop(),
    }
}

#[tauri::command]
pub fn stop_midi_input(state: State<'_, MidiInputState>) -> Result<(), String> {
    state.stop()
}
