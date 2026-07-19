//! Linux ambient light via IIO sysfs illuminance channels.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static ILLUMINANCE_PATH: OnceLock<Option<IlluminanceSource>> = OnceLock::new();

#[derive(Clone)]
struct IlluminanceSource {
    value_path: PathBuf,
    scale: f64,
}

pub fn is_available() -> bool {
    source().is_some()
}

pub fn read_illuminance() -> Option<f64> {
    let source = source()?;
    let raw = fs::read_to_string(&source.value_path).ok()?;
    let raw: f64 = raw.trim().parse().ok()?;
    let lux = raw * source.scale;
    if lux.is_finite() && lux >= 0.0 {
        Some(lux)
    } else {
        None
    }
}

fn source() -> Option<&'static IlluminanceSource> {
    ILLUMINANCE_PATH
        .get_or_init(find_illuminance_source)
        .as_ref()
}

fn find_illuminance_source() -> Option<IlluminanceSource> {
    let devices = Path::new("/sys/bus/iio/devices");
    let entries = fs::read_dir(devices).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with("iio:device"))
        {
            continue;
        }

        let input = path.join("in_illuminance_input");
        if input.is_file() {
            return Some(IlluminanceSource {
                value_path: input,
                scale: 1.0,
            });
        }

        let raw = path.join("in_illuminance_raw");
        if raw.is_file() {
            let scale = fs::read_to_string(path.join("in_illuminance_scale"))
                .ok()
                .and_then(|text| text.trim().parse().ok())
                .unwrap_or(1.0);
            return Some(IlluminanceSource {
                value_path: raw,
                scale,
            });
        }
    }

    None
}
