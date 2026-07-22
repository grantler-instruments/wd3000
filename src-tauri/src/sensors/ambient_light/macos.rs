//! macOS ambient light via IOHID (Apple ALS) and AppleLMUController fallback.

use core_foundation::base::{CFRelease, CFRetain, CFType, TCFType};
use core_foundation::dictionary::{CFDictionary, CFDictionaryRef, CFMutableDictionary};
use core_foundation::number::CFNumber;
use core_foundation::set::{CFSet, CFSetRef};
use core_foundation::string::CFString;
use core_foundation_sys::base::{kCFAllocatorDefault, CFIndex, CFTypeRef};
use core_foundation_sys::runloop::{
    kCFRunLoopDefaultMode, CFRunLoopGetCurrent, CFRunLoopRunInMode,
};
use core_foundation_sys::set::{CFSetGetCount, CFSetGetValues};
use std::ffi::CString;
use std::os::raw::{c_int, c_void};
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

const K_IO_HID_DEVICE_USAGE_PAGE_KEY: &str = "DeviceUsagePage";
const K_IO_HID_DEVICE_USAGE_KEY: &str = "DeviceUsage";

const APPLE_ALS_USAGE_PAGE: i32 = 0xFF00;
const APPLE_ALS_USAGE: i32 = 4;
const HID_SENSOR_USAGE_PAGE: i32 = 0x0020;
const HID_AMBIENT_LIGHT_USAGE: i32 = 0x0041;

const PROBE_TIMEOUT: Duration = Duration::from_millis(400);
const LUX_BITS_NONE: u64 = u64::MAX;

type IOHIDManagerRef = *mut c_void;
type IOHIDDeviceRef = *mut c_void;
type IOReturn = c_int;
type IoServiceT = u32;
type IoConnectT = u32;
type IoIteratorT = u32;
type KernReturn = c_int;
type MachPort = u32;

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
    fn IOHIDManagerClose(manager: IOHIDManagerRef, options: IOHIDOptionsType) -> IOReturn;
    fn IOHIDDeviceGetService(device: IOHIDDeviceRef) -> IoServiceT;
    fn IOHIDDeviceOpen(device: IOHIDDeviceRef, options: IOHIDOptionsType) -> IOReturn;
    fn IOHIDDeviceClose(device: IOHIDDeviceRef, options: IOHIDOptionsType) -> IOReturn;
    fn IOHIDDeviceScheduleWithRunLoop(
        device: IOHIDDeviceRef,
        run_loop: *mut c_void,
        run_loop_mode: CFTypeRef,
    );
    fn IOHIDDeviceUnscheduleFromRunLoop(
        device: IOHIDDeviceRef,
        run_loop: *mut c_void,
        run_loop_mode: CFTypeRef,
    );
    fn IOHIDDeviceRegisterInputReportCallback(
        device: IOHIDDeviceRef,
        report: *mut u8,
        report_length: CFIndex,
        callback: Option<
            unsafe extern "C" fn(
                context: *mut c_void,
                result: IOReturn,
                sender: *mut c_void,
                report_type: i32,
                report_id: u32,
                report: *mut u8,
                report_length: CFIndex,
            ),
        >,
        context: *mut c_void,
    );

    fn IOServiceMatching(name: *const i8) -> CFTypeRef;
    fn IOServiceGetMatchingService(main_port: MachPort, matching: CFTypeRef) -> IoServiceT;
    fn IOServiceOpen(
        service: IoServiceT,
        owning_task: MachPort,
        type_: u32,
        connect: *mut IoConnectT,
    ) -> KernReturn;
    fn IOServiceClose(connect: IoConnectT) -> KernReturn;
    fn IOObjectRelease(object: IoServiceT) -> KernReturn;
    fn IORegistryEntryGetChildIterator(
        entry: IoServiceT,
        plane: *const i8,
        iterator: *mut IoIteratorT,
    ) -> KernReturn;
    fn IOIteratorNext(iterator: IoIteratorT) -> IoServiceT;
    fn IORegistryEntryCreateCFProperty(
        entry: IoServiceT,
        key: CFTypeRef,
        allocator: CFTypeRef,
        options: u32,
    ) -> CFTypeRef;
    fn IOConnectCallMethod(
        connection: IoConnectT,
        selector: u32,
        input: *const u64,
        input_count: u32,
        input_struct: *const c_void,
        input_struct_size: usize,
        output: *mut u64,
        output_count: *mut u32,
        output_struct: *mut c_void,
        output_struct_size: *mut usize,
    ) -> KernReturn;
}

extern "C" {
    static mut mach_task_self_: MachPort;
}

static LATEST_LUX_BITS: AtomicU64 = AtomicU64::new(LUX_BITS_NONE);
static REPORT_BUFFER: OnceLock<Mutex<Vec<u8>>> = OnceLock::new();

fn report_buffer() -> &'static Mutex<Vec<u8>> {
    REPORT_BUFFER.get_or_init(|| Mutex::new(vec![0_u8; 256]))
}

unsafe extern "C" fn input_report_callback(
    _context: *mut c_void,
    result: IOReturn,
    _sender: *mut c_void,
    _report_type: i32,
    _report_id: u32,
    report: *mut u8,
    report_length: CFIndex,
) {
    if result != 0 || report.is_null() || report_length <= 0 {
        return;
    }
    let len = report_length as usize;
    let bytes = unsafe { std::slice::from_raw_parts(report, len) };
    if let Some(lux) = parse_illuminance_report(bytes) {
        LATEST_LUX_BITS.store(lux.to_bits(), Ordering::Relaxed);
    }
}

fn parse_illuminance_report(report: &[u8]) -> Option<f64> {
    // Apple color ALS (UsagePage 0xFF00 / Usage 4): lux as LE f32 at offset 5.
    if report.len() >= 9 {
        let bits = u32::from_le_bytes([report[5], report[6], report[7], report[8]]);
        let value = f32::from_bits(bits) as f64;
        if value.is_finite() && (0.0..10_000_000.0).contains(&value) {
            return Some(value);
        }
    }

    // Generic HID ambient-light style: first meaningful u16 as a relative level.
    if report.len() >= 3 {
        let raw = u16::from_le_bytes([report[1], report[2]]) as f64;
        if raw > 0.0 {
            return Some(raw);
        }
    }

    None
}

pub fn is_available() -> bool {
    if read_hid_current_lux().is_some() {
        return true;
    }
    if let Ok(session) = start_hid_session() {
        drop(session);
        return true;
    }
    read_lmu().is_some()
}

pub fn read_illuminance() -> Option<f64> {
    if let Some(lux) = read_hid_current_lux() {
        return Some(lux);
    }
    let bits = LATEST_LUX_BITS.load(Ordering::Relaxed);
    if bits != LUX_BITS_NONE {
        return Some(f64::from_bits(bits));
    }
    read_lmu()
}

pub struct WatchSession {
    stop_flag: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl WatchSession {
    pub fn start() -> Result<Self, String> {
        if read_hid_current_lux().is_some() {
            return Ok(Self {
                stop_flag: Arc::new(AtomicBool::new(false)),
                handle: None,
            });
        }
        if let Ok(session) = start_hid_session() {
            return Ok(session);
        }
        if read_lmu().is_some() {
            return Ok(Self {
                stop_flag: Arc::new(AtomicBool::new(false)),
                handle: None,
            });
        }
        Err("Ambient light sensor not found on this machine.".into())
    }
}

impl Drop for WatchSession {
    fn drop(&mut self) {
        self.stop_flag.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
        LATEST_LUX_BITS.store(LUX_BITS_NONE, Ordering::Relaxed);
    }
}

fn read_hid_current_lux() -> Option<f64> {
    unsafe {
        let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOHIDOptionsType::None);
        if manager.is_null() {
            return None;
        }

        let matching = matching_dictionary(APPLE_ALS_USAGE_PAGE, APPLE_ALS_USAGE);
        IOHIDManagerSetDeviceMatching(manager, matching.as_concrete_TypeRef());
        let devices_set_ref = IOHIDManagerCopyDevices(manager);
        if devices_set_ref.is_null() {
            CFRelease(manager as CFTypeRef);
            return None;
        }

        let devices_set: CFSet<*const c_void> =
            CFSet::wrap_under_create_rule(devices_set_ref as CFSetRef);
        let mut device_values = vec![ptr::null(); devices_set.len()];
        CFSetGetValues(
            devices_set.as_concrete_TypeRef(),
            device_values.as_mut_ptr(),
        );

        let lux = device_values.into_iter().find_map(|device| {
            (!device.is_null())
                .then(|| {
                    read_current_lux_property(IOHIDDeviceGetService(device as IOHIDDeviceRef), 2)
                })
                .flatten()
        });
        CFRelease(manager as CFTypeRef);
        lux
    }
}

unsafe fn read_current_lux_property(entry: IoServiceT, remaining_depth: usize) -> Option<f64> {
    let key = CFString::from_static_string("CurrentLux");
    let property = unsafe {
        IORegistryEntryCreateCFProperty(
            entry,
            key.as_concrete_TypeRef() as CFTypeRef,
            kCFAllocatorDefault,
            0,
        )
    };
    if !property.is_null() {
        let value = unsafe { CFNumber::wrap_under_create_rule(property as _) }.to_f64();
        if value.is_some_and(|lux| lux.is_finite() && lux >= 0.0) {
            return value;
        }
    }
    if remaining_depth == 0 {
        return None;
    }

    let plane = CString::new("IOService").ok()?;
    let mut iterator = 0;
    if unsafe { IORegistryEntryGetChildIterator(entry, plane.as_ptr(), &mut iterator) } != 0 {
        return None;
    }
    loop {
        let child = unsafe { IOIteratorNext(iterator) };
        if child == 0 {
            break;
        }
        let value = unsafe { read_current_lux_property(child, remaining_depth - 1) };
        unsafe {
            IOObjectRelease(child);
        }
        if value.is_some() {
            unsafe {
                IOObjectRelease(iterator);
            }
            return value;
        }
    }
    unsafe {
        IOObjectRelease(iterator);
    }
    None
}

fn start_hid_session() -> Result<WatchSession, String> {
    LATEST_LUX_BITS.store(LUX_BITS_NONE, Ordering::Relaxed);
    let stop_flag = Arc::new(AtomicBool::new(false));
    let thread_stop = Arc::clone(&stop_flag);

    let handle = thread::Builder::new()
        .name("ambient-light-hid".into())
        .spawn(move || {
            if let Err(err) = run_hid_runloop(thread_stop) {
                eprintln!("ambient light HID session ended: {err}");
            }
        })
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + PROBE_TIMEOUT;
    while Instant::now() < deadline {
        if LATEST_LUX_BITS.load(Ordering::Relaxed) != LUX_BITS_NONE {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }

    if LATEST_LUX_BITS.load(Ordering::Relaxed) == LUX_BITS_NONE {
        stop_flag.store(true, Ordering::Relaxed);
        let _ = handle.join();
        return Err("Ambient light sensor not found on this machine.".into());
    }

    Ok(WatchSession {
        stop_flag,
        handle: Some(handle),
    })
}

fn run_hid_runloop(stop_flag: Arc<AtomicBool>) -> Result<(), String> {
    unsafe {
        let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOHIDOptionsType::None);
        if manager.is_null() {
            return Err("IOHIDManagerCreate failed".into());
        }

        let matching = matching_dictionary(APPLE_ALS_USAGE_PAGE, APPLE_ALS_USAGE);
        IOHIDManagerSetDeviceMatching(manager, matching.as_concrete_TypeRef());
        if IOHIDManagerOpen(manager, IOHIDOptionsType::None) != 0 {
            CFRelease(manager as CFTypeRef);
            return Err("IOHIDManagerOpen failed".into());
        }

        let mut devices_set_ref = IOHIDManagerCopyDevices(manager);
        let empty = devices_set_ref.is_null() || CFSetGetCount(devices_set_ref as CFSetRef) == 0;
        if empty {
            if !devices_set_ref.is_null() {
                CFRelease(devices_set_ref);
            }
            let matching = matching_dictionary(HID_SENSOR_USAGE_PAGE, HID_AMBIENT_LIGHT_USAGE);
            IOHIDManagerSetDeviceMatching(manager, matching.as_concrete_TypeRef());
            devices_set_ref = IOHIDManagerCopyDevices(manager);
        }

        if devices_set_ref.is_null() {
            IOHIDManagerClose(manager, IOHIDOptionsType::None);
            CFRelease(manager as CFTypeRef);
            return Err("No ambient light HID device".into());
        }

        let devices_set: CFSet<*const c_void> =
            CFSet::wrap_under_create_rule(devices_set_ref as CFSetRef);
        if devices_set.is_empty() {
            IOHIDManagerClose(manager, IOHIDOptionsType::None);
            CFRelease(manager as CFTypeRef);
            return Err("No ambient light HID device".into());
        }

        let mut device_values: Vec<*const c_void> = vec![ptr::null(); devices_set.len()];
        CFSetGetValues(
            devices_set.as_concrete_TypeRef(),
            device_values.as_mut_ptr(),
        );

        let mut opened: Option<IOHIDDeviceRef> = None;
        for dev in device_values {
            if dev.is_null() {
                continue;
            }
            let device = dev as IOHIDDeviceRef;
            if IOHIDDeviceOpen(device, IOHIDOptionsType::None) != 0 {
                continue;
            }
            CFRetain(device as CFTypeRef);
            opened = Some(device);
            break;
        }

        let Some(device) = opened else {
            IOHIDManagerClose(manager, IOHIDOptionsType::None);
            CFRelease(manager as CFTypeRef);
            return Err("Failed to open ambient light HID device".into());
        };

        let run_loop = CFRunLoopGetCurrent();
        IOHIDDeviceScheduleWithRunLoop(
            device,
            run_loop as *mut c_void,
            kCFRunLoopDefaultMode as CFTypeRef,
        );

        let mut buffer_guard = report_buffer()
            .lock()
            .map_err(|_| "Ambient light report buffer lock poisoned")?;
        let report_ptr = buffer_guard.as_mut_ptr();
        let report_len = buffer_guard.len() as CFIndex;
        IOHIDDeviceRegisterInputReportCallback(
            device,
            report_ptr,
            report_len,
            Some(input_report_callback),
            ptr::null_mut(),
        );
        drop(buffer_guard);

        while !stop_flag.load(Ordering::Relaxed) {
            CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.05, 0);
        }

        IOHIDDeviceRegisterInputReportCallback(device, ptr::null_mut(), 0, None, ptr::null_mut());
        IOHIDDeviceUnscheduleFromRunLoop(
            device,
            run_loop as *mut c_void,
            kCFRunLoopDefaultMode as CFTypeRef,
        );
        IOHIDDeviceClose(device, IOHIDOptionsType::None);
        CFRelease(device as CFTypeRef);
        IOHIDManagerClose(manager, IOHIDOptionsType::None);
        CFRelease(manager as CFTypeRef);
    }

    Ok(())
}

fn matching_dictionary(usage_page: i32, usage: i32) -> CFDictionary<CFType, CFType> {
    let usage_page = CFNumber::from(usage_page);
    let usage = CFNumber::from(usage);
    let mut dict = CFMutableDictionary::new();
    dict.set(
        CFString::from_static_string(K_IO_HID_DEVICE_USAGE_PAGE_KEY).as_CFType(),
        usage_page.as_CFType(),
    );
    dict.set(
        CFString::from_static_string(K_IO_HID_DEVICE_USAGE_KEY).as_CFType(),
        usage.as_CFType(),
    );
    dict.to_immutable()
}

fn read_lmu() -> Option<f64> {
    unsafe {
        let name = CString::new("AppleLMUController").ok()?;
        let matching = IOServiceMatching(name.as_ptr());
        if matching.is_null() {
            return None;
        }
        // kIOMainPortDefault is 0 on modern macOS.
        let service = IOServiceGetMatchingService(0, matching);
        if service == 0 {
            return None;
        }

        let mut connect: IoConnectT = 0;
        let open = IOServiceOpen(service, mach_task_self_, 0, &mut connect);
        if open != 0 {
            IOObjectRelease(service);
            return None;
        }

        let mut values = [0_u64; 2];
        let mut output_count: u32 = 2;
        let call = IOConnectCallMethod(
            connect,
            0,
            ptr::null(),
            0,
            ptr::null(),
            0,
            values.as_mut_ptr(),
            &mut output_count,
            ptr::null_mut(),
            ptr::null_mut(),
        );

        IOServiceClose(connect);
        IOObjectRelease(service);

        if call != 0 || output_count == 0 {
            return None;
        }

        let avg = if output_count >= 2 {
            (values[0] as f64 + values[1] as f64) / 2.0
        } else {
            values[0] as f64
        };
        Some(avg)
    }
}
