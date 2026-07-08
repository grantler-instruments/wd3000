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
  host: string;
  port: number;
}

export interface SensorMidiMapping {
  enabled: boolean;
  portName: string | null;
  channel: number;
  cc: number;
  min: number;
  max: number;
}

export interface SensorAxisMapping {
  osc: SensorOscMapping;
  midi: SensorMidiMapping;
}

type LegacySensorOutputProtocol = "osc" | "midi" | "both";

type StoredSensorAxisMapping = Partial<SensorAxisMapping> & {
  protocol?: LegacySensorOutputProtocol;
  osc?: Partial<SensorOscMapping>;
  midi?: Partial<SensorMidiMapping>;
};

export function sensorAxisKey(sensorId: string, axis: string) {
  return `${sensorId}:${axis}`;
}

export function defaultSensorAxisMapping(
  sensorId: string,
  axis: string,
  output = { oscHost: "127.0.0.1", oscPort: 9000, midiPortName: null as string | null },
): SensorAxisMapping {
  return {
    osc: {
      enabled: true,
      address: `/sensors/${sensorId}/${axis}`,
      host: output.oscHost,
      port: output.oscPort,
    },
    midi: {
      enabled: false,
      portName: output.midiPortName,
      channel: 1,
      cc: 0,
      min: 0,
      max: 127,
    },
  };
}

function legacyProtocolEnabled(
  protocol: LegacySensorOutputProtocol | undefined,
  target: "osc" | "midi",
  fallback: boolean,
) {
  if (protocol === undefined) {
    return fallback;
  }

  if (protocol === "both") {
    return true;
  }

  return protocol === target;
}

export function normalizeSensorAxisMapping(
  mapping: StoredSensorAxisMapping,
  output = { oscHost: "127.0.0.1", oscPort: 9000, midiPortName: null as string | null },
  sensorId = "sensor",
  axis = "axis",
): SensorAxisMapping {
  const defaults = defaultSensorAxisMapping(sensorId, axis, output);

  return {
    osc: {
      enabled:
        mapping.osc?.enabled ??
        legacyProtocolEnabled(mapping.protocol, "osc", defaults.osc.enabled),
      address: mapping.osc?.address ?? defaults.osc.address,
      host: mapping.osc?.host || defaults.osc.host,
      port: mapping.osc?.port ?? defaults.osc.port,
    },
    midi: {
      enabled:
        mapping.midi?.enabled ??
        legacyProtocolEnabled(mapping.protocol, "midi", defaults.midi.enabled),
      portName: mapping.midi?.portName ?? defaults.midi.portName,
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
