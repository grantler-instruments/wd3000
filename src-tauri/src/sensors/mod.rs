use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Runtime, State};

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
    #[cfg(mobile)]
    mobile_watching: bool,
}

impl SensorsState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(SensorsInner {
                #[cfg(target_os = "macos")]
                lid_watcher: None,
                #[cfg(mobile)]
                mobile_watching: false,
            }),
        }
    }
}

#[tauri::command]
pub fn list_sensors<R: Runtime>(app: AppHandle<R>) -> Result<Vec<SensorDescriptor>, String> {
    let mut sensors = Vec::new();

    #[cfg(target_os = "macos")]
    {
        sensors.extend(macos_lid::list_sensors());
    }

    #[cfg(mobile)]
    {
        if let Some(plugin) = app.try_state::<tauri_plugin_sensors::Sensors<R>>() {
            sensors.extend(plugin.list_sensors()?);
        }
    }

    #[cfg(not(mobile))]
    let _ = &app;

    Ok(sensors)
}

#[tauri::command]
pub fn start_sensor_watch<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, SensorsState>,
    sensor_ids: Vec<String>,
) -> Result<(), String> {
    if sensor_ids.is_empty() {
        return Err("Select at least one sensor.".into());
    }

    let mut started = false;
    let mut inner = state.inner.lock().map_err(|_| "Sensor state lock poisoned")?;

    #[cfg(target_os = "macos")]
    {
        if sensor_ids.iter().any(|id| id == "lid_angle") {
            if inner.lid_watcher.is_none() {
                inner.lid_watcher = Some(macos_lid::LidAngleWatcher::start(app.clone())?);
                started = true;
            }
        }
    }

    #[cfg(mobile)]
    {
        let mobile_ids: Vec<String> = sensor_ids
            .iter()
            .filter(|id| *id != "lid_angle")
            .cloned()
            .collect();

        if !mobile_ids.is_empty() {
            let plugin = app
                .try_state::<tauri_plugin_sensors::Sensors<R>>()
                .ok_or("Sensors plugin is not available")?;
            plugin.start_watch(app.clone(), mobile_ids)?;
            inner.mobile_watching = true;
            started = true;
        }
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

    #[cfg(mobile)]
    {
        if inner.mobile_watching {
            if let Some(plugin) = _app.try_state::<tauri_plugin_sensors::Sensors<R>>() {
                plugin.stop_watch()?;
            }
            inner.mobile_watching = false;
        }
    }

    Ok(())
}

pub fn emit_sensor_reading<R: Runtime>(app: &AppHandle<R>, reading: SensorReading) {
    let _ = app.emit("sensor-reading", reading);
}
