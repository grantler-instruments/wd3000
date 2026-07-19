import { useEffect, useRef } from "react";
import type { PerformerIoConfig } from "../../types";
import { sendSensorAxisOutput } from "./output";
import type { SensorAxisMapping } from "./types";
import { defaultSensorAxisMapping, normalizeSensorAxisMapping, sensorAxisKey } from "./types";

export function useBrowserSensorOutput(
  enabled: boolean,
  performerIo: PerformerIoConfig,
  sensorMappings: Record<string, SensorAxisMapping>,
  readings: Array<{
    sensorId: string;
    axis: string;
    value: number | null;
  }>,
) {
  const performerIoRef = useRef(performerIo);
  const sensorMappingsRef = useRef(sensorMappings);
  const lastSentRef = useRef<Record<string, number>>({});
  performerIoRef.current = performerIo;
  sensorMappingsRef.current = sensorMappings;

  useEffect(() => {
    if (!enabled) {
      lastSentRef.current = {};
      return;
    }

    for (const reading of readings) {
      const { sensorId, axis, value } = reading;
      if (value == null || Number.isNaN(value)) {
        continue;
      }

      const key = sensorAxisKey(sensorId, axis);
      const previous = lastSentRef.current[key];
      if (previous !== undefined && Math.abs(previous - value) < 0.1) {
        continue;
      }

      lastSentRef.current[key] = value;
      const stored = sensorMappingsRef.current[key];
      const mapping = stored
        ? normalizeSensorAxisMapping(stored, performerIoRef.current, sensorId, axis)
        : defaultSensorAxisMapping(sensorId, axis, performerIoRef.current);

      void sendSensorAxisOutput(performerIoRef.current, mapping, value).catch(() => {
        // Ignore transient send failures while sensors are streaming.
      });
    }
  }, [enabled, readings, performerIo, sensorMappings]);
}
