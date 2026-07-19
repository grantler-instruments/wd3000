//! Windows ambient light via WinRT LightSensor.

use windows::Devices::Sensors::LightSensor;

pub fn is_available() -> bool {
    read_illuminance().is_some()
}

pub fn read_illuminance() -> Option<f64> {
    let sensor = LightSensor::GetDefault().ok()?;
    let reading = sensor.GetCurrentReading().ok()?;
    let lux = reading.IlluminanceInLux().ok()?;
    if lux.is_finite() && lux >= 0.0 {
        Some(f64::from(lux))
    } else {
        None
    }
}
