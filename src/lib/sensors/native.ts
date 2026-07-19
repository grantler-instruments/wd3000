import { Channel, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getAppPlatform } from "../platform";
import type { SensorDescriptor, SensorReading } from "./types";

type RawSensorReading = SensorReading & {
  sensor_id?: string;
};

let mobileReadingHandler: ((reading: SensorReading) => void) | null = null;

function normalizeSensorReading(payload: RawSensorReading): SensorReading {
  return {
    sensorId: payload.sensorId ?? payload.sensor_id ?? "",
    timestamp: payload.timestamp,
    values: payload.values ?? {},
  };
}

function handleRawReading(payload: RawSensorReading, onReading: (reading: SensorReading) => void) {
  const reading = normalizeSensorReading(payload);
  if (!reading.sensorId) {
    return;
  }
  onReading(reading);
}

export async function listNativeSensors(): Promise<SensorDescriptor[]> {
  return invoke<SensorDescriptor[]>("list_sensors");
}

export async function startNativeSensorWatch(sensorIds: string[]): Promise<void> {
  if (getAppPlatform() === "mobile") {
    const handler = mobileReadingHandler;
    if (!handler) {
      throw new Error("Sensor listener is not ready.");
    }
    // Create a fresh Channel on every start. Stopping drops the Rust Channel,
    // which ends the JS callback — reusing that Channel leaves readings dead.
    const channel = new Channel<RawSensorReading>((payload) => {
      handleRawReading(payload, handler);
    });
    await invoke("start_sensor_watch", {
      sensorIds,
      channel,
    });
    return;
  }

  await invoke("start_sensor_watch", { sensorIds });
}

export async function stopNativeSensorWatch(): Promise<void> {
  await invoke("stop_sensor_watch");
}

export async function listenNativeSensorReadings(
  onReading: (reading: SensorReading) => void,
): Promise<UnlistenFn> {
  if (getAppPlatform() === "mobile") {
    mobileReadingHandler = onReading;
    return () => {
      if (mobileReadingHandler === onReading) {
        mobileReadingHandler = null;
      }
    };
  }

  // Desktop (e.g. macOS lid angle) emits via app.emit().
  return listen<RawSensorReading>("sensor-reading", (event) => {
    handleRawReading(event.payload, onReading);
  });
}
