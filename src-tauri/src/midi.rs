use midir::{MidiOutput, MidiOutputConnection};
use std::sync::Mutex;

use crate::midi_virtual::VirtualMidiState;

pub struct MidiState {
    connection: Mutex<Option<MidiConnection>>,
}

struct MidiConnection {
    port_name: String,
    conn: MidiOutputConnection,
}

impl MidiState {
    pub fn new() -> Self {
        Self {
            connection: Mutex::new(None),
        }
    }

    pub fn list_outputs() -> Result<Vec<String>, String> {
        let midi_out = MidiOutput::new("wd3000").map_err(|e| e.to_string())?;
        Ok(midi_out
            .ports()
            .iter()
            .map(|port| midi_out.port_name(port).unwrap_or_else(|_| "Unknown".to_string()))
            .collect())
    }

    fn connect(port_name: &str) -> Result<MidiOutputConnection, String> {
        let midi_out = MidiOutput::new("wd3000").map_err(|e| e.to_string())?;
        for port in midi_out.ports() {
            if midi_out.port_name(&port).unwrap_or_default() == port_name {
                return midi_out.connect(&port, "wd3000-out").map_err(|e| e.to_string());
            }
        }
        Err(format!("MIDI port not found: {port_name}"))
    }

    fn with_connection<F>(&self, port_name: &str, send: F) -> Result<(), String>
    where
        F: FnOnce(&mut MidiOutputConnection) -> Result<(), String>,
    {
        let mut guard = self.connection.lock().map_err(|e| e.to_string())?;
        let needs_reconnect = guard
            .as_ref()
            .map(|connection| connection.port_name != port_name)
            .unwrap_or(true);

        if needs_reconnect {
            *guard = Some(MidiConnection {
                port_name: port_name.to_string(),
                conn: Self::connect(port_name)?,
            });
        }

        let connection = guard.as_mut().ok_or("MIDI connection unavailable")?;
        send(&mut connection.conn)
    }

    fn send_bytes(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        bytes: &[u8],
    ) -> Result<(), String> {
        if virtual_midi.try_send(port_name, bytes)? {
            return Ok(());
        }

        self.with_connection(port_name, |conn| {
            conn.send(bytes).map_err(|e| e.to_string())
        })
    }

    pub fn send_note(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        note: u8,
        velocity: u8,
    ) -> Result<(), String> {
        let status = if velocity == 0 {
            0x80 | channel_mask(channel)
        } else {
            0x90 | channel_mask(channel)
        };
        self.send_bytes(virtual_midi, port_name, &[status, note, velocity])
    }

    pub fn send_note_off(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        note: u8,
        velocity: u8,
    ) -> Result<(), String> {
        let status = 0x80 | channel_mask(channel);
        self.send_bytes(virtual_midi, port_name, &[status, note, velocity])
    }

    pub fn send_cc(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        cc: u8,
        value: u8,
    ) -> Result<(), String> {
        let status = 0xB0 | channel_mask(channel);
        self.send_bytes(virtual_midi, port_name, &[status, cc, value])
    }

    pub fn send_program_change(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        program: u8,
    ) -> Result<(), String> {
        let status = 0xC0 | channel_mask(channel);
        self.send_bytes(virtual_midi, port_name, &[status, program])
    }

    pub fn send_pitch_bend(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        value: u16,
    ) -> Result<(), String> {
        let value = value.min(16383);
        let status = 0xE0 | channel_mask(channel);
        let lsb = (value & 0x7F) as u8;
        let msb = ((value >> 7) & 0x7F) as u8;
        self.send_bytes(virtual_midi, port_name, &[status, lsb, msb])
    }

    pub fn send_channel_pressure(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        pressure: u8,
    ) -> Result<(), String> {
        let status = 0xD0 | channel_mask(channel);
        self.send_bytes(virtual_midi, port_name, &[status, pressure])
    }

    pub fn send_poly_pressure(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        channel: u8,
        note: u8,
        pressure: u8,
    ) -> Result<(), String> {
        let status = 0xA0 | channel_mask(channel);
        self.send_bytes(virtual_midi, port_name, &[status, note, pressure])
    }

    pub fn send_raw(
        &self,
        virtual_midi: &VirtualMidiState,
        port_name: &str,
        bytes: Vec<u8>,
    ) -> Result<(), String> {
        if bytes.is_empty() {
            return Err("MIDI message cannot be empty".to_string());
        }

        self.send_bytes(virtual_midi, port_name, &bytes)
    }
}

fn channel_mask(channel: u8) -> u8 {
    (channel.saturating_sub(1)) & 0x0F
}
