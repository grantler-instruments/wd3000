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

function defaultSensorMidiInputRange(sensorId: string, axis: string) {
  if (sensorId === "lid_angle" && axis === "angle") {
    return { min: 0, max: 180 };
  }

  if (sensorId === "ambient_light" && axis === "illuminance") {
    return { min: 0, max: 1000 };
  }

  return { min: 0, max: 127 };
}

export function defaultSensorAxisMapping(
  sensorId: string,
  axis: string,
  performerIo: Pick<PerformerIoConfig, "oscSenders" | "midiOutputs">,
): SensorAxisMapping {
  const midiRange = defaultSensorMidiInputRange(sensorId, axis);

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
      min: midiRange.min,
      max: midiRange.max,
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
  const midiRange = defaultSensorMidiInputRange(sensorId, axis);
  const storedMidiMin = mapping.midi?.min;
  const storedMidiMax = mapping.midi?.max;
  const usesLegacyLidAngleMidiRange =
    sensorId === "lid_angle" && axis === "angle" && storedMidiMin === 0 && storedMidiMax === 127;

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
      min: usesLegacyLidAngleMidiRange ? midiRange.min : (storedMidiMin ?? defaults.midi.min),
      max: usesLegacyLidAngleMidiRange ? midiRange.max : (storedMidiMax ?? defaults.midi.max),
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
