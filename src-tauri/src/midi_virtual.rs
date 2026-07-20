use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, State};

use crate::midi_input;

const VIRTUAL_MIDI_SUPPORTED: bool = cfg!(any(
    target_os = "macos",
    target_os = "ios",
    target_os = "linux"
));

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VirtualMidiPorts {
    pub outputs: Vec<String>,
    pub inputs: Vec<String>,
}

pub struct VirtualMidiState {
    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
    outputs: Mutex<HashMap<String, midir::MidiOutputConnection>>,
    #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
    inputs: Mutex<HashMap<String, midir::MidiInputConnection<()>>>,
}

impl VirtualMidiState {
    pub fn new() -> Self {
        Self {
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
            outputs: Mutex::new(HashMap::new()),
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
            inputs: Mutex::new(HashMap::new()),
        }
    }

    pub fn supports() -> bool {
        VIRTUAL_MIDI_SUPPORTED
    }

    pub fn list(&self) -> Result<VirtualMidiPorts, String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            let mut outputs: Vec<String> = self
                .outputs
                .lock()
                .map_err(|e| e.to_string())?
                .keys()
                .cloned()
                .collect();
            outputs.sort();

            let mut inputs: Vec<String> = self
                .inputs
                .lock()
                .map_err(|e| e.to_string())?
                .keys()
                .cloned()
                .collect();
            inputs.sort();

            Ok(VirtualMidiPorts { outputs, inputs })
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            Ok(VirtualMidiPorts {
                outputs: Vec::new(),
                inputs: Vec::new(),
            })
        }
    }

    pub fn has_input(&self, port_name: &str) -> Result<bool, String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            Ok(self
                .inputs
                .lock()
                .map_err(|e| e.to_string())?
                .contains_key(port_name))
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = port_name;
            Ok(false)
        }
    }

    pub fn create_output(&self, port_name: &str) -> Result<(), String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            use midir::os::unix::VirtualOutput;
            use midir::MidiOutput;

            let name = normalize_port_name(port_name)?;
            let mut outputs = self.outputs.lock().map_err(|e| e.to_string())?;
            if outputs.contains_key(&name) {
                return Err(format!("Virtual MIDI output already exists: {name}"));
            }

            let midi_out = MidiOutput::new("wd3000-virtual").map_err(|e| e.to_string())?;
            let conn = midi_out
                .create_virtual(&name)
                .map_err(|e| e.to_string())?;
            outputs.insert(name, conn);
            Ok(())
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = port_name;
            Err("Virtual MIDI ports are not supported on this platform".to_string())
        }
    }

    pub fn create_input(&self, app: AppHandle, port_name: &str) -> Result<(), String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            use midir::os::unix::VirtualInput;
            use midir::{Ignore, MidiInput};

            let name = normalize_port_name(port_name)?;
            let mut inputs = self.inputs.lock().map_err(|e| e.to_string())?;
            if inputs.contains_key(&name) {
                return Err(format!("Virtual MIDI input already exists: {name}"));
            }

            let mut midi_in = MidiInput::new("wd3000-virtual-input").map_err(|e| e.to_string())?;
            midi_in.ignore(Ignore::None);

            let app_handle = app.clone();
            let conn = midi_in
                .create_virtual(
                    &name,
                    move |_timestamp, message, _| {
                        midi_input::parse_and_emit(&app_handle, message);
                    },
                    (),
                )
                .map_err(|e| e.to_string())?;

            inputs.insert(name, conn);
            Ok(())
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = (app, port_name);
            Err("Virtual MIDI ports are not supported on this platform".to_string())
        }
    }

    pub fn close_output(&self, port_name: &str) -> Result<(), String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            let name = port_name.trim();
            let removed = self
                .outputs
                .lock()
                .map_err(|e| e.to_string())?
                .remove(name)
                .is_some();
            if !removed {
                return Err(format!("Virtual MIDI output not found: {name}"));
            }
            Ok(())
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = port_name;
            Err("Virtual MIDI ports are not supported on this platform".to_string())
        }
    }

    pub fn close_input(&self, port_name: &str) -> Result<(), String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            let name = port_name.trim();
            let removed = self
                .inputs
                .lock()
                .map_err(|e| e.to_string())?
                .remove(name)
                .is_some();
            if !removed {
                return Err(format!("Virtual MIDI input not found: {name}"));
            }
            Ok(())
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = port_name;
            Err("Virtual MIDI ports are not supported on this platform".to_string())
        }
    }

    /// Sends on a virtual output if one exists with this name. Returns true when handled.
    pub fn try_send(&self, port_name: &str, bytes: &[u8]) -> Result<bool, String> {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "linux"))]
        {
            let mut outputs = self.outputs.lock().map_err(|e| e.to_string())?;
            let Some(conn) = outputs.get_mut(port_name) else {
                return Ok(false);
            };
            conn.send(bytes).map_err(|e| e.to_string())?;
            Ok(true)
        }

        #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "linux")))]
        {
            let _ = (port_name, bytes);
            Ok(false)
        }
    }
}

fn normalize_port_name(port_name: &str) -> Result<String, String> {
    let name = port_name.trim();
    if name.is_empty() {
        return Err("Virtual MIDI port name cannot be empty".to_string());
    }
    Ok(name.to_string())
}

#[tauri::command]
pub fn supports_virtual_midi() -> bool {
    VirtualMidiState::supports()
}

#[tauri::command]
pub fn list_virtual_midi_ports(
    state: State<'_, VirtualMidiState>,
) -> Result<VirtualMidiPorts, String> {
    state.list()
}

#[tauri::command]
pub fn create_virtual_midi_output(
    state: State<'_, VirtualMidiState>,
    port_name: String,
) -> Result<(), String> {
    state.create_output(&port_name)
}

#[tauri::command]
pub fn create_virtual_midi_input(
    app: AppHandle,
    state: State<'_, VirtualMidiState>,
    port_name: String,
) -> Result<(), String> {
    state.create_input(app, &port_name)
}

#[tauri::command]
pub fn close_virtual_midi_output(
    state: State<'_, VirtualMidiState>,
    port_name: String,
) -> Result<(), String> {
    state.close_output(&port_name)
}

#[tauri::command]
pub fn close_virtual_midi_input(
    state: State<'_, VirtualMidiState>,
    port_name: String,
) -> Result<(), String> {
    state.close_input(&port_name)
}
