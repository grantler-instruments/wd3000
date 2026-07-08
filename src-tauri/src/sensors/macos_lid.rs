#![cfg(target_os = "macos")]

use super::{emit_sensor_reading, SensorDescriptor, SensorReading};
use core_foundation::base::{CFRelease, CFRetain, CFType, TCFType};
use core_foundation::dictionary::{CFDictionary, CFDictionaryRef, CFMutableDictionary};
use core_foundation::number::CFNumber;
use core_foundation::set::{CFSet, CFSetRef};
use core_foundation::string::CFString;
use core_foundation_sys::base::{kCFAllocatorDefault, CFIndex, CFTypeRef};
use core_foundation_sys::set::CFSetGetValues;
use std::collections::HashMap;
use std::os::raw::{c_int, c_void};
use std::ptr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const K_IO_HID_VENDOR_ID_KEY: &str = "VendorID";
const K_IO_HID_PRODUCT_ID_KEY: &str = "ProductID";
const K_IO_HID_USAGE_PAGE_KEY: &str = "UsagePage";
const K_IO_HID_USAGE_KEY: &str = "Usage";

const LID_ANGLE_VENDOR_ID: i32 = 0x05AC;
const LID_ANGLE_PRODUCT_ID: i32 = 0x8104;
const LID_ANGLE_USAGE_PAGE: i32 = 0x0020;
const LID_ANGLE_USAGE: i32 = 0x008A;
const LID_ANGLE_REPORT_ID_PRIMARY: CFIndex = 1;
const LID_ANGLE_REPORT_ID_FALLBACK: CFIndex = 0;
const READ_INTERVAL_MS: u64 = 16;

type IOHIDManagerRef = *mut c_void;
type IOHIDDeviceRef = *mut c_void;
type IOReturn = c_int;

#[derive(Clone, Copy)]
struct HidDevice {
    device: IOHIDDeviceRef,
    report_id: CFIndex,
}

#[repr(C)]
enum IOHIDReportType {
    Input = 0,
    Output = 1,
    Feature = 2,
}

#[repr(C)]
enum IOHIDOptionsType {
    None = 0x00,
}

#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IOHIDManagerCreate(allocator: CFTypeRef, options: IOHIDOptionsType) -> IOHIDManagerRef;
    fn IOHIDManagerSetDeviceMatching(manager: IOHIDManagerRef, matching: CFDictionaryRef);
    fn IOHIDManagerCopyDevices(manager: IOHIDManagerRef) -> CFTypeRef;
    fn IOHIDManagerOpen(manager: IOHIDManagerRef, options: IOHIDOptionsType) -> IOReturn;
    fn IOHIDDeviceOpen(device: IOHIDDeviceRef, options: IOHIDOptionsType) -> IOReturn;
    fn IOHIDDeviceGetReport(
        device: IOHIDDeviceRef,
        report_type: IOHIDReportType,
        report_id: CFIndex,
        report: *mut u8,
        report_length: *mut CFIndex,
    ) -> IOReturn;
    fn IOHIDDeviceClose(device: IOHIDDeviceRef, options: IOHIDOptionsType) -> IOReturn;
}

pub fn list_sensors() -> Vec<SensorDescriptor> {
    if !is_lid_angle_available() {
        return Vec::new();
    }

    vec![SensorDescriptor {
        id: "lid_angle".into(),
        label: "Lid angle".into(),
        description: "MacBook screen hinge angle from the built-in HID sensor.".into(),
        unit: Some("°".into()),
        axes: Some(vec!["angle".into()]),
    }]
}

pub struct LidAngleWatcher {
    stop_flag: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl LidAngleWatcher {
    pub fn start<R: tauri::Runtime>(app: AppHandle<R>) -> Result<Self, String> {
        let device = find_lid_angle_device().ok_or_else(|| {
            "Lid angle sensor not found. This feature is only available on supported MacBooks."
                .to_string()
        })?;

        let stop_flag = Arc::new(AtomicBool::new(false));
        let thread_stop = Arc::clone(&stop_flag);
        let app_handle = app.clone();

        let device_ptr = device.device as usize;
        let report_id = device.report_id;

        let handle = thread::spawn(move || {
            let hid_device = HidDevice {
                device: device_ptr as IOHIDDeviceRef,
                report_id,
            };

            unsafe {
                let open_result = IOHIDDeviceOpen(hid_device.device, IOHIDOptionsType::None);
                if open_result != 0 {
                    eprintln!("Failed to open lid angle HID device: {open_result}");
                    release_device(hid_device);
                    return;
                }
            }

            let mut last_raw: Option<u16> = None;

            while !thread_stop.load(Ordering::Relaxed) {
                if let Some((angle, raw)) = read_lid_angle(hid_device) {
                    if last_raw != Some(raw) {
                        let mut values = HashMap::new();
                        values.insert("angle".into(), f64::from(angle));

                        emit_sensor_reading(
                            &app_handle,
                            SensorReading {
                                sensor_id: "lid_angle".into(),
                                timestamp: current_timestamp_ms(),
                                values,
                            },
                        );
                        last_raw = Some(raw);
                    }
                } else {
                    last_raw = None;
                }

                thread::sleep(Duration::from_millis(READ_INTERVAL_MS));
            }

            unsafe {
                IOHIDDeviceClose(hid_device.device, IOHIDOptionsType::None);
            }
            release_device(hid_device);
        });

        Ok(Self {
            stop_flag,
            handle: Some(handle),
        })
    }

    pub fn stop(mut self) {
        self.stop_flag.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

fn is_lid_angle_available() -> bool {
    match find_lid_angle_device() {
        Some(device) => {
            release_device(device);
            true
        }
        None => false,
    }
}

fn create_matching_dictionary() -> CFDictionary<CFType, CFType> {
    let vendor_id = CFNumber::from(LID_ANGLE_VENDOR_ID);
    let product_id = CFNumber::from(LID_ANGLE_PRODUCT_ID);
    let usage_page = CFNumber::from(LID_ANGLE_USAGE_PAGE);
    let usage = CFNumber::from(LID_ANGLE_USAGE);

    let mut dict = CFMutableDictionary::new();
    dict.set(
        CFString::from_static_string(K_IO_HID_VENDOR_ID_KEY).as_CFType(),
        vendor_id.as_CFType(),
    );
    dict.set(
        CFString::from_static_string(K_IO_HID_PRODUCT_ID_KEY).as_CFType(),
        product_id.as_CFType(),
    );
    dict.set(
        CFString::from_static_string(K_IO_HID_USAGE_PAGE_KEY).as_CFType(),
        usage_page.as_CFType(),
    );
    dict.set(
        CFString::from_static_string(K_IO_HID_USAGE_KEY).as_CFType(),
        usage.as_CFType(),
    );
    dict.to_immutable()
}

fn find_lid_angle_device() -> Option<HidDevice> {
    unsafe {
        let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOHIDOptionsType::None);
        if manager.is_null() {
            return None;
        }

        let matching_dict = create_matching_dictionary();
        IOHIDManagerSetDeviceMatching(manager, matching_dict.as_concrete_TypeRef());

        if IOHIDManagerOpen(manager, IOHIDOptionsType::None) != 0 {
            CFRelease(manager as CFTypeRef);
            return None;
        }

        let devices_set_ref = IOHIDManagerCopyDevices(manager);
        CFRelease(manager as CFTypeRef);

        if devices_set_ref.is_null() {
            return None;
        }

        let devices_set: CFSet<*const c_void> =
            CFSet::wrap_under_create_rule(devices_set_ref as CFSetRef);

        if devices_set.is_empty() {
            return None;
        }

        let mut device_values: Vec<*const c_void> = vec![ptr::null(); devices_set.len()];
        CFSetGetValues(
            devices_set.as_concrete_TypeRef(),
            device_values.as_mut_ptr(),
        );

        for dev in device_values {
            if dev.is_null() {
                continue;
            }

            let device = dev as IOHIDDeviceRef;

            if IOHIDDeviceOpen(device, IOHIDOptionsType::None) != 0 {
                continue;
            }

            let report_id = match probe_report_id(device) {
                Some(report_id) => report_id,
                None => {
                    IOHIDDeviceClose(device, IOHIDOptionsType::None);
                    continue;
                }
            };

            // Close after probing, but retain the handle for the watcher thread.
            IOHIDDeviceClose(device, IOHIDOptionsType::None);
            CFRetain(device as CFTypeRef);

            return Some(HidDevice { device, report_id });
        }

        None
    }
}

fn probe_report_id(device: IOHIDDeviceRef) -> Option<CFIndex> {
    for report_id in [LID_ANGLE_REPORT_ID_PRIMARY, LID_ANGLE_REPORT_ID_FALLBACK] {
        let mut report = [0_u8; 8];
        let mut report_length = report.len() as CFIndex;
        let result = unsafe {
            IOHIDDeviceGetReport(
                device,
                IOHIDReportType::Feature,
                report_id,
                report.as_mut_ptr(),
                &mut report_length,
            )
        };

        if result == 0 && report_length >= 3 {
            return Some(report_id);
        }
    }

    None
}

fn read_lid_angle(hid_device: HidDevice) -> Option<(f32, u16)> {
    read_lid_angle_report(hid_device, IOHIDReportType::Feature)
}

fn read_lid_angle_report(hid_device: HidDevice, report_type: IOHIDReportType) -> Option<(f32, u16)> {
    let mut report = [0_u8; 32];
    let mut report_length = report.len() as CFIndex;

    let result = unsafe {
        IOHIDDeviceGetReport(
            hid_device.device,
            report_type,
            hid_device.report_id,
            report.as_mut_ptr(),
            &mut report_length,
        )
    };

    if result != 0 || report_length < 3 {
        return None;
    }

    let raw = u16::from_le_bytes([report[1], report[2]]);
    Some((raw as f32, raw))
}

fn release_device(device: HidDevice) {
    unsafe {
        CFRelease(device.device as CFTypeRef);
    }
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}
