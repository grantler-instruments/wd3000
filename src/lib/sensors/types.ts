import type { PerformerIoConfig } from "../../types";

export interface SensorDescriptor {
  id: string;
  label: string;
  description: string;
  unit?: string;
  axes?: string[];
}

export interface SensorReading {
  sensorId: string;
  timestamp: number;
  values: Record<string, number>;
}

export interface SensorOscMapping {
  enabled: boolean;
  address: string;
  senderId: string | null;
}

export interface SensorMidiMapping {
  enabled: boolean;
  outputId: string | null;
  channel: number;
  cc: number;
  min: number;
  max: number;
}

export interface SensorAxisMapping {
  osc: SensorOscMapping;
  midi: SensorMidiMapping;
}

export function sensorAxisKey(sensorId: string, axis: string) {
  return `${sensorId}:${axis}`;
}

export function defaultSensorAxisMapping(
  sensorId: string,
  axis: string,
  performerIo: Pick<PerformerIoConfig, "oscSenders" | "midiOutputs">,
): SensorAxisMapping {
  return {
    osc: {
      enabled: true,
      address: `/sensors/${sensorId}/${axis}`,
      senderId: performerIo.oscSenders[0]?.id ?? null,
    },
    midi: {
      enabled: false,
      outputId: performerIo.midiOutputs[0]?.id ?? null,
      channel: 1,
      cc: 0,
      min: 0,
      max: 127,
    },
  };
}

export function normalizeSensorAxisMapping(
  mapping: Partial<SensorAxisMapping>,
  performerIo: Pick<PerformerIoConfig, "oscSenders" | "midiOutputs">,
  sensorId = "sensor",
  axis = "axis",
): SensorAxisMapping {
  const defaults = defaultSensorAxisMapping(sensorId, axis, performerIo);

  return {
    osc: {
      enabled: mapping.osc?.enabled ?? defaults.osc.enabled,
      address: mapping.osc?.address ?? defaults.osc.address,
      senderId: mapping.osc?.senderId ?? defaults.osc.senderId,
    },
    midi: {
      enabled: mapping.midi?.enabled ?? defaults.midi.enabled,
      outputId: mapping.midi?.outputId ?? defaults.midi.outputId,
      channel: mapping.midi?.channel ?? defaults.midi.channel,
      cc: mapping.midi?.cc ?? defaults.midi.cc,
      min: mapping.midi?.min ?? defaults.midi.min,
      max: mapping.midi?.max ?? defaults.midi.max,
    },
  };
}

export interface BrowserSensorSupport {
  orientation: boolean;
  motion: boolean;
  ambientLight: boolean;
}

export interface BrowserOrientationReading {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
}

export interface BrowserMotionReading {
  acceleration: { x: number | null; y: number | null; z: number | null };
  accelerationIncludingGravity: {
    x: number | null;
    y: number | null;
    z: number | null;
  };
  rotationRate: { alpha: number | null; beta: number | null; gamma: number | null };
}
