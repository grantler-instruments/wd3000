use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{plugin::TauriPlugin, AppHandle, Manager, Runtime};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.grantler_instruments.wd3000.sensors";
#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_sensors);

#[derive(Clone, Deserialize, Serialize)]
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

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorReading {
    pub sensor_id: String,
    pub timestamp: u64,
    pub values: HashMap<String, f64>,
}

pub struct Sensors<R: Runtime> {
    #[cfg(not(mobile))]
    _marker: std::marker::PhantomData<fn() -> R>,
    #[cfg(mobile)]
    mobile_plugin_handle: tauri::plugin::PluginHandle<R>,
}

impl<R: Runtime> Sensors<R> {
    pub fn list_sensors(&self) -> Result<Vec<SensorDescriptor>, String> {
        #[cfg(mobile)]
        {
            return self
                .mobile_plugin_handle
                .run_mobile_plugin("listSensors", ())
                .map_err(|error| error.to_string());
        }

        #[cfg(not(mobile))]
        {
            let _ = self;
            Ok(Vec::new())
        }
    }

    pub fn start_watch(
        &self,
        app: AppHandle<R>,
        sensor_ids: Vec<String>,
        channel: Option<serde_json::Value>,
    ) -> Result<(), String> {
        #[cfg(mobile)]
        {
            let _ = app;
            let mut payload = serde_json::json!({ "sensorIds": sensor_ids });
            if let Some(channel) = channel {
                payload["channel"] = channel;
            }
            return self
                .mobile_plugin_handle
                .run_mobile_plugin("startWatch", payload)
                .map_err(|error| error.to_string());
        }

        #[cfg(not(mobile))]
        {
            let _ = (self, app, sensor_ids, channel);
            Err("Mobile sensors are not available on this platform.".into())
        }
    }

    pub fn stop_watch(&self) -> Result<(), String> {
        #[cfg(mobile)]
        {
            return self
                .mobile_plugin_handle
                .run_mobile_plugin("stopWatch", ())
                .map_err(|error| error.to_string());
        }

        #[cfg(not(mobile))]
        {
            let _ = self;
            Ok(())
        }
    }
}

pub trait SensorsExt<R: Runtime> {
    fn sensors(&self) -> &Sensors<R>;
}

impl<R: Runtime, T: Manager<R>> SensorsExt<R> for T {
    fn sensors(&self) -> &Sensors<R> {
        self.state::<Sensors<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("sensors")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "SensorsPlugin")?;
            #[cfg(target_os = "ios")]
            let handle = api.register_ios_plugin(init_plugin_sensors)?;

            app.manage(Sensors {
                #[cfg(not(mobile))]
                _marker: std::marker::PhantomData::<fn() -> R>,
                #[cfg(mobile)]
                mobile_plugin_handle: handle,
            });
            Ok(())
        })
        .build()
}
