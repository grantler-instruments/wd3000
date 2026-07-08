import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { SensorDescriptor, SensorReading } from "./types";

type RawSensorReading = SensorReading & {
  sensor_id?: string;
};

function normalizeSensorReading(payload: RawSensorReading): SensorReading {
  return {
    sensorId: payload.sensorId ?? payload.sensor_id ?? "",
    timestamp: payload.timestamp,
    values: payload.values ?? {},
  };
}

export async function listNativeSensors(): Promise<SensorDescriptor[]> {
  return invoke<SensorDescriptor[]>("list_sensors");
}

export async function startNativeSensorWatch(sensorIds: string[]): Promise<void> {
  await invoke("start_sensor_watch", { sensorIds });
}

export async function stopNativeSensorWatch(): Promise<void> {
  await invoke("stop_sensor_watch");
}

export function listenNativeSensorReadings(
  onReading: (reading: SensorReading) => void,
): Promise<UnlistenFn> {
  return listen<RawSensorReading>("sensor-reading", (event) => {
    const reading = normalizeSensorReading(event.payload);
    if (!reading.sensorId) {
      return;
    }
    onReading(reading);
  });
}
