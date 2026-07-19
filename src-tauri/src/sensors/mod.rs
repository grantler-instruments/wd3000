use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::ipc::JavaScriptChannelId;
use tauri::{AppHandle, Emitter, Runtime, State, Webview};

#[cfg(mobile)]
use tauri::ipc::Channel;
#[cfg(mobile)]
use tauri::Manager;

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
mod ambient_light;

#[cfg(target_os = "macos")]
mod macos_lid;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorDescriptor {
    pub id: String,
    pub label: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub axes: Option<Vec<String>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorReading {
    pub sensor_id: String,
    pub timestamp: u64,
    pub values: HashMap<String, f64>,
}

pub struct SensorsState {
    inner: Mutex<SensorsInner>,
}

struct SensorsInner {
    #[cfg(target_os = "macos")]
    lid_watcher: Option<macos_lid::LidAngleWatcher>,
    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    ambient_light_watcher: Option<ambient_light::AmbientLightWatcher>,
    #[cfg(mobile)]
    mobile_watching: bool,
    #[cfg(mobile)]
    mobile_channel: Option<Channel<serde_json::Value>>,
}

impl SensorsState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(SensorsInner {
                #[cfg(target_os = "macos")]
                lid_watcher: None,
                #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
                ambient_light_watcher: None,
                #[cfg(mobile)]
                mobile_watching: false,
                #[cfg(mobile)]
                mobile_channel: None,
            }),
        }
    }
}

#[cfg(mobile)]
fn is_desktop_only_sensor(id: &str) -> bool {
    matches!(id, "lid_angle" | "ambient_light")
}

#[tauri::command]
pub fn list_sensors<R: Runtime>(app: AppHandle<R>) -> Result<Vec<SensorDescriptor>, String> {
    let mut sensors = Vec::new();

    #[cfg(target_os = "macos")]
    {
        sensors.extend(macos_lid::list_sensors());
    }

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        sensors.extend(ambient_light::list_sensors());
    }

    #[cfg(mobile)]
    {
        if let Some(plugin) = app.try_state::<tauri_plugin_sensors::Sensors<R>>() {
            sensors.extend(plugin.list_sensors()?.into_iter().map(|descriptor| {
                SensorDescriptor {
                    id: descriptor.id,
                    label: descriptor.label,
                    description: descriptor.description,
                    unit: descriptor.unit,
                    axes: descriptor.axes,
                }
            }));
        }
    }

    #[cfg(not(mobile))]
    let _ = &app;

    Ok(sensors)
}

#[tauri::command]
pub fn start_sensor_watch<R: Runtime>(
    app: AppHandle<R>,
    webview: Webview<R>,
    state: State<'_, SensorsState>,
    sensor_ids: Vec<String>,
    // Mobile: Channel from the webview, forwarded to the native plugin so readings
    // stream back without plugin:sensors|* ACL on the frontend.
    channel: Option<JavaScriptChannelId>,
) -> Result<(), String> {
    if sensor_ids.is_empty() {
        return Err("Select at least one sensor.".into());
    }

    let mut started = false;
    let mut inner = state.inner.lock().map_err(|_| "Sensor state lock poisoned")?;

    #[cfg(target_os = "macos")]
    {
        let _ = (&channel, &webview);
        if sensor_ids.iter().any(|id| id == "lid_angle") {
            if inner.lid_watcher.is_none() {
                inner.lid_watcher = Some(macos_lid::LidAngleWatcher::start(app.clone())?);
                started = true;
            } else {
                started = true;
            }
        }
    }

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        if sensor_ids.iter().any(|id| id == "ambient_light") {
            if inner.ambient_light_watcher.is_none() {
                inner.ambient_light_watcher =
                    Some(ambient_light::AmbientLightWatcher::start(app.clone())?);
                started = true;
            } else {
                started = true;
            }
        }
    }

    #[cfg(mobile)]
    {
        let mobile_ids: Vec<String> = sensor_ids
            .iter()
            .filter(|id| !is_desktop_only_sensor(id))
            .cloned()
            .collect();

        if !mobile_ids.is_empty() {
            let plugin = app
                .try_state::<tauri_plugin_sensors::Sensors<R>>()
                .ok_or("Sensors plugin is not available")?;
            // channel_on registers the callback in the mobile CHANNELS map so the
            // Swift/Kotlin plugin can stream readings back to the webview.
            let rust_channel = channel.map(|id| id.channel_on::<R, serde_json::Value>(webview));
            let channel_value = match &rust_channel {
                Some(ch) => Some(serde_json::to_value(ch).map_err(|e| e.to_string())?),
                None => None,
            };
            plugin.start_watch(app.clone(), mobile_ids, channel_value)?;
            // Keep the Channel alive while watching. Dropping it sends an "end"
            // event that permanently disables the JS callback for that Channel.
            inner.mobile_channel = rust_channel;
            inner.mobile_watching = true;
            started = true;
        }
    }

    #[cfg(not(any(mobile, target_os = "macos", windows, target_os = "linux")))]
    {
        let _ = (app, webview, channel);
    }

    #[cfg(all(
        not(mobile),
        any(target_os = "macos", windows, target_os = "linux")
    ))]
    {
        let _ = (&channel, &webview);
    }

    if !started {
        return Err("No supported sensors were selected for this platform.".into());
    }

    Ok(())
}

#[tauri::command]
pub fn stop_sensor_watch<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SensorsState>,
) -> Result<(), String> {
    let mut inner = state.inner.lock().map_err(|_| "Sensor state lock poisoned")?;

    #[cfg(target_os = "macos")]
    {
        if let Some(watcher) = inner.lid_watcher.take() {
            watcher.stop();
        }
    }

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        if let Some(watcher) = inner.ambient_light_watcher.take() {
            watcher.stop();
        }
    }

    #[cfg(mobile)]
    {
        if inner.mobile_watching {
            if let Some(plugin) = _app.try_state::<tauri_plugin_sensors::Sensors<R>>() {
                plugin.stop_watch()?;
            }
            inner.mobile_watching = false;
            inner.mobile_channel = None;
        }
    }

    Ok(())
}

pub fn emit_sensor_reading<R: Runtime>(app: &AppHandle<R>, reading: SensorReading) {
    let _ = app.emit("sensor-reading", reading);
}
