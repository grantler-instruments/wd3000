import type { StateCreator } from "zustand";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
  type SensorAxisMapping,
  type SensorMidiMapping,
} from "../../lib/sensors/types";
import type { AppStore } from "../appStoreTypes";

export interface SensorsSlice {
  sensorMappings: Record<string, SensorAxisMapping>;
  getSensorAxisMapping: (sensorId: string, axis: string) => SensorAxisMapping;
  updateSensorAxisMapping: (
    sensorId: string,
    axis: string,
    patch: {
      osc?: Partial<SensorAxisMapping["osc"]>;
      midi?: Partial<SensorMidiMapping>;
    },
  ) => void;
}

export const createSensorsSlice: StateCreator<AppStore, [], [], SensorsSlice> = (
  set,
  get,
) => ({
  sensorMappings: {},
  getSensorAxisMapping: (sensorId, axis) => {
    const key = sensorAxisKey(sensorId, axis);
    const { performerIo } = get();
    const stored = get().sensorMappings[key];
    return stored
      ? normalizeSensorAxisMapping(stored, performerIo, sensorId, axis)
      : defaultSensorAxisMapping(sensorId, axis, performerIo);
  },
  updateSensorAxisMapping: (sensorId, axis, patch) => {
    const key = sensorAxisKey(sensorId, axis);
    const { performerIo } = get();
    const stored = get().sensorMappings[key];
    const current = stored
      ? normalizeSensorAxisMapping(stored, performerIo, sensorId, axis)
      : defaultSensorAxisMapping(sensorId, axis, performerIo);

    set((state) => ({
      sensorMappings: {
        ...state.sensorMappings,
        [key]: {
          ...current,
          ...patch,
          osc: { ...current.osc, ...patch.osc },
          midi: { ...current.midi, ...patch.midi },
        },
      },
    }));
  },
});
