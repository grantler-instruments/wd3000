use rosc::{OscMessage, OscPacket, OscType};
use serde::Deserialize;
use serde_json::Value;
use std::net::UdpSocket;

#[derive(Deserialize)]
pub struct OscArgInput {
    #[serde(rename = "type")]
    pub arg_type: String,
    pub value: Option<Value>,
}

fn parse_osc_arg(arg: &OscArgInput) -> Result<OscType, String> {
    match arg.arg_type.as_str() {
        "int" => {
            let value = arg
                .value
                .as_ref()
                .and_then(Value::as_i64)
                .ok_or("Int argument requires an integer value")?;
            Ok(OscType::Int(value as i32))
        }
        "float" => {
            let value = arg
                .value
                .as_ref()
                .and_then(Value::as_f64)
                .ok_or("Float argument requires a numeric value")?;
            Ok(OscType::Float(value as f32))
        }
        "string" => {
            let value = arg
                .value
                .as_ref()
                .and_then(Value::as_str)
                .ok_or("String argument requires a string value")?;
            Ok(OscType::String(value.to_string()))
        }
        "true" => Ok(OscType::Bool(true)),
        "false" => Ok(OscType::Bool(false)),
        other => Err(format!("Unknown OSC argument type: {other}")),
    }
}

pub fn send(host: &str, port: u16, address: &str, args: &[OscArgInput]) -> Result<(), String> {
    let osc_args: Result<Vec<OscType>, String> = args.iter().map(parse_osc_arg).collect();
    let osc_args = osc_args?;

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let target = format!("{host}:{port}");
    let msg = OscMessage {
        addr: address.to_string(),
        args: osc_args,
    };
    let packet = OscPacket::Message(msg);
    let buffer = rosc::encoder::encode(&packet).map_err(|e| e.to_string())?;
    socket.send_to(&buffer, target).map_err(|e| e.to_string())?;
    Ok(())
}
