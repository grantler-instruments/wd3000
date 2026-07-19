//! Desktop ambient light (illuminance) sensor.
//!
//! Only listed when a platform probe can open a readable ALS backend.

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(windows)]
mod windows;

use super::{emit_sensor_reading, SensorDescriptor, SensorReading};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const READ_INTERVAL_MS: u64 = 100;
const SENSOR_ID: &str = "ambient_light";

pub fn list_sensors() -> Vec<SensorDescriptor> {
    if !is_available() {
        return Vec::new();
    }

    vec![SensorDescriptor {
        id: SENSOR_ID.into(),
        label: "Ambient light".into(),
        description: "Illuminance from the built-in ambient light sensor.".into(),
        unit: Some("lx".into()),
        axes: Some(vec!["illuminance".into()]),
    }]
}

fn is_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        return macos::is_available();
    }
    #[cfg(windows)]
    {
        return windows::is_available();
    }
    #[cfg(target_os = "linux")]
    {
        return linux::is_available();
    }
    #[cfg(not(any(target_os = "macos", windows, target_os = "linux")))]
    {
        false
    }
}

fn read_illuminance() -> Option<f64> {
    #[cfg(target_os = "macos")]
    {
        return macos::read_illuminance();
    }
    #[cfg(windows)]
    {
        return windows::read_illuminance();
    }
    #[cfg(target_os = "linux")]
    {
        return linux::read_illuminance();
    }
    #[cfg(not(any(target_os = "macos", windows, target_os = "linux")))]
    {
        None
    }
}

pub struct AmbientLightWatcher {
    stop_flag: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
    #[cfg(target_os = "macos")]
    _macos_session: Option<macos::WatchSession>,
}

impl AmbientLightWatcher {
    pub fn start<R: tauri::Runtime>(app: AppHandle<R>) -> Result<Self, String> {
        #[cfg(target_os = "macos")]
        let macos_session = Some(macos::WatchSession::start()?);

        #[cfg(not(target_os = "macos"))]
        if !is_available() {
            return Err(
                "Ambient light sensor not found on this machine.".into(),
            );
        }

        let stop_flag = Arc::new(AtomicBool::new(false));
        let thread_stop = Arc::clone(&stop_flag);
        let app_handle = app.clone();

        let handle = thread::spawn(move || {
            let mut last: Option<u64> = None;

            while !thread_stop.load(Ordering::Relaxed) {
                if let Some(lux) = read_illuminance() {
                    // Quantize for change detection so tiny float noise does not spam.
                    let key = lux.to_bits();
                    if last != Some(key) {
                        let mut values = HashMap::new();
                        values.insert("illuminance".into(), lux);
                        emit_sensor_reading(
                            &app_handle,
                            SensorReading {
                                sensor_id: SENSOR_ID.into(),
                                timestamp: current_timestamp_ms(),
                                values,
                            },
                        );
                        last = Some(key);
                    }
                } else {
                    last = None;
                }

                thread::sleep(Duration::from_millis(READ_INTERVAL_MS));
            }
        });

        Ok(Self {
            stop_flag,
            handle: Some(handle),
            #[cfg(target_os = "macos")]
            _macos_session: macos_session,
        })
    }

    pub fn stop(mut self) {
        self.stop_flag.store(true, Ordering::Relaxed);
        #[cfg(target_os = "macos")]
        {
            self._macos_session.take();
        }
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}
