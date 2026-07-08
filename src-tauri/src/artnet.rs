use std::net::UdpSocket;

const ARTNET_HEADER: &[u8; 8] = b"Art-Net\0";
const OPCODE_ARTDMX: u16 = 0x5000;
const ARTNET_PROTOCOL_VERSION: u8 = 14;

pub fn send_dmx(
    host: &str,
    port: u16,
    universe: u16,
    sequence: u8,
    data: &[u8],
) -> Result<(), String> {
    if data.is_empty() {
        return Err("DMX data must contain at least one channel".to_string());
    }
    if data.len() > 512 {
        return Err("DMX data cannot exceed 512 channels".to_string());
    }

    let mut packet = vec![0_u8; 18 + data.len()];
    packet[0..8].copy_from_slice(ARTNET_HEADER);
    packet[8..10].copy_from_slice(&OPCODE_ARTDMX.to_le_bytes());
    packet[10] = 0;
    packet[11] = ARTNET_PROTOCOL_VERSION;
    packet[12] = sequence;
    packet[13] = 0;
    packet[14..16].copy_from_slice(&universe.to_le_bytes());
    packet[16..18].copy_from_slice(&(data.len() as u16).to_be_bytes());
    packet[18..].copy_from_slice(data);

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let target = format!("{host}:{port}");
    socket
        .send_to(&packet, target)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub struct ParsedArtDmx {
    pub sequence: u8,
    pub physical: u8,
    pub universe: u16,
    pub channels: Vec<u8>,
}

pub fn parse_artdmx(data: &[u8]) -> Option<ParsedArtDmx> {
    if data.len() < 18 {
        return None;
    }
    if data.get(0..8)? != ARTNET_HEADER {
        return None;
    }

    let opcode = u16::from_le_bytes([data[8], data[9]]);
    if opcode != OPCODE_ARTDMX {
        return None;
    }

    let length = u16::from_be_bytes([data[16], data[17]]) as usize;
    if data.len() < 18 + length {
        return None;
    }

    Some(ParsedArtDmx {
        sequence: data[12],
        physical: data[13],
        universe: u16::from_le_bytes([data[14], data[15]]),
        channels: data[18..18 + length].to_vec(),
    })
}

pub fn format_artdmx_summary(packet: &ParsedArtDmx) -> String {
    let channel_count = packet.channels.len();
    let preview = format_channel_preview(&packet.channels, 8);
    format!(
        "Universe {} seq {} phys {} [{} ch] {}",
        packet.universe, packet.sequence, packet.physical, channel_count, preview
    )
}

fn format_channel_preview(channels: &[u8], max: usize) -> String {
    let mut parts: Vec<String> = channels
        .iter()
        .enumerate()
        .filter(|(_, value)| **value != 0)
        .take(max)
        .map(|(index, value)| format!("ch{}={}", index + 1, value))
        .collect();

    if parts.is_empty() {
        parts.push("all zero".to_string());
    } else {
        let non_zero = channels.iter().filter(|value| **value != 0).count();
        if non_zero > max {
            parts.push(format!("+{} more", non_zero - max));
        }
    }

    parts.join(" ")
}
