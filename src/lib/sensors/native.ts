import { addPluginListener, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getAppPlatform } from "../platform";
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

function handleRawReading(
  payload: RawSensorReading,
  onReading: (reading: SensorReading) => void,
) {
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
  await invoke("start_sensor_watch", { sensorIds });
}

export async function stopNativeSensorWatch(): Promise<void> {
  await invoke("stop_sensor_watch");
}

export async function listenNativeSensorReadings(
  onReading: (reading: SensorReading) => void,
): Promise<UnlistenFn> {
  // Mobile plugins emit via trigger() → addPluginListener.
  // Desktop (e.g. macOS lid angle) emits via app.emit() → listen().
  if (getAppPlatform() === "mobile") {
    const listener = await addPluginListener<RawSensorReading>(
      "sensors",
      "sensor-reading",
      (payload) => handleRawReading(payload, onReading),
    );
    return () => {
      void listener.unregister();
    };
  }

  return listen<RawSensorReading>("sensor-reading", (event) => {
    handleRawReading(event.payload, onReading);
  });
}
