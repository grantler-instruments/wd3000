mod artnet;
mod artnet_listen;
mod midi;
mod midi_input;
mod osc;
mod osc_listen;
mod sensors;
mod tuio_listen;
mod tuio_send;

use artnet_listen::ArtNetListenerState;
use midi::MidiState;
use midi_input::MidiInputState;
use osc_listen::OscListenerState;
use tuio_listen::TuioListenerState;
use tuio_send::TuioSenderState;

#[tauri::command]
fn send_artnet_dmx(
    host: String,
    port: u16,
    universe: u16,
    sequence: u8,
    channels: Vec<u8>,
) -> Result<(), String> {
    artnet::send_dmx(&host, port, universe, sequence, &channels)
}

#[tauri::command]
fn send_osc(
    host: String,
    port: u16,
    address: String,
    args: Vec<osc::OscArgInput>,
) -> Result<(), String> {
    osc::send(&host, port, &address, &args)
}

#[tauri::command]
fn list_midi_outputs() -> Result<Vec<String>, String> {
    MidiState::list_outputs()
}

#[tauri::command]
fn send_midi_note(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    note: u8,
    velocity: u8,
) -> Result<(), String> {
    state.send_note(&port_name, channel, note, velocity)
}

#[tauri::command]
fn send_midi_cc(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    cc: u8,
    value: u8,
) -> Result<(), String> {
    state.send_cc(&port_name, channel, cc, value)
}

#[tauri::command]
fn send_midi_note_off(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    note: u8,
    velocity: u8,
) -> Result<(), String> {
    state.send_note_off(&port_name, channel, note, velocity)
}

#[tauri::command]
fn send_midi_program_change(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    program: u8,
) -> Result<(), String> {
    state.send_program_change(&port_name, channel, program)
}

#[tauri::command]
fn send_midi_pitch_bend(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    value: u16,
) -> Result<(), String> {
    state.send_pitch_bend(&port_name, channel, value)
}

#[tauri::command]
fn send_midi_channel_pressure(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    pressure: u8,
) -> Result<(), String> {
    state.send_channel_pressure(&port_name, channel, pressure)
}

#[tauri::command]
fn send_midi_poly_pressure(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    channel: u8,
    note: u8,
    pressure: u8,
) -> Result<(), String> {
    state.send_poly_pressure(&port_name, channel, note, pressure)
}

#[tauri::command]
fn send_midi_raw(
    state: tauri::State<'_, MidiState>,
    port_name: String,
    bytes: Vec<u8>,
) -> Result<(), String> {
    state.send_raw(&port_name, bytes)
}

#[tauri::command]
fn start_input_listeners(
    app: tauri::AppHandle,
    osc_state: tauri::State<'_, OscListenerState>,
    midi_state: tauri::State<'_, MidiInputState>,
    osc_listen_port: u16,
    midi_input_port_name: Option<String>,
) -> Result<(), String> {
    if osc_listen_port > 0 {
        osc_state.start(app.clone(), osc_listen_port)?;
    } else {
        osc_state.stop()?;
    }

    match midi_input_port_name {
        Some(name) if !name.trim().is_empty() => midi_state.start(app, name.trim())?,
        _ => midi_state.stop()?,
    }

    Ok(())
}

#[tauri::command]
fn stop_input_listeners(
    osc_state: tauri::State<'_, OscListenerState>,
    midi_state: tauri::State<'_, MidiInputState>,
) -> Result<(), String> {
    osc_state.stop()?;
    midi_state.stop()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sensors::init())
        .manage(MidiState::new())
        .manage(MidiInputState::new())
        .manage(OscListenerState::new())
        .manage(ArtNetListenerState::new())
        .manage(TuioListenerState::new())
        .manage(TuioSenderState::new())
        .manage(sensors::SensorsState::new())
        .invoke_handler(tauri::generate_handler![
            send_osc,
            list_midi_outputs,
            send_midi_note,
            send_midi_note_off,
            send_midi_cc,
            send_midi_program_change,
            send_midi_pitch_bend,
            send_midi_channel_pressure,
            send_midi_poly_pressure,
            send_midi_raw,
            midi_input::list_midi_inputs,
            osc_listen::start_osc_listener,
            osc_listen::stop_osc_listener,
            artnet_listen::start_artnet_listener,
            artnet_listen::stop_artnet_listener,
            send_artnet_dmx,
            tuio_listen::start_tuio_listener,
            tuio_listen::stop_tuio_listener,
            tuio_send::send_tuio_cursors,
            midi_input::start_midi_input,
            midi_input::stop_midi_input,
            start_input_listeners,
            stop_input_listeners,
            sensors::list_sensors,
            sensors::start_sensor_watch,
            sensors::stop_sensor_watch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
