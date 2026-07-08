import { useEffect, useRef } from "react";
import { sendSensorAxisOutput } from "./output";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
} from "./types";
import type { OutputConfig } from "../../types";
import type { SensorAxisMapping } from "./types";

export function useBrowserSensorOutput(
  enabled: boolean,
  output: OutputConfig,
  sensorMappings: Record<string, SensorAxisMapping>,
  readings: Array<{
    sensorId: string;
    axis: string;
    value: number | null;
  }>,
) {
  const outputRef = useRef(output);
  const sensorMappingsRef = useRef(sensorMappings);
  const lastSentRef = useRef<Record<string, number>>({});
  outputRef.current = output;
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
        ? normalizeSensorAxisMapping(stored, outputRef.current, sensorId, axis)
        : defaultSensorAxisMapping(sensorId, axis, outputRef.current);

      void sendSensorAxisOutput(outputRef.current, mapping, value).catch(() => {
        // Ignore transient send failures while sensors are streaming.
      });
    }
  }, [enabled, readings, output, sensorMappings]);
}
