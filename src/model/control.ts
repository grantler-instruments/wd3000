/** @deprecated Legacy exclusive protocol selector; migrated to per-mapping `enabled`. */
export type ControlProtocol = "osc" | "midi" | "mqtt" | "both";

export type ControlType = "button" | "switch" | "slider" | "rotary" | "keyboard" | "pad" | "tabs";

export const CONTROL_WIDGET_TYPES = [
  "button",
  "switch",
  "slider",
  "rotary",
  "keyboard",
  "pad",
  "tabs",
] as const satisfies readonly ControlType[];

export interface MqttMapping {
  enabled: boolean;
  topic: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export interface OscMapping {
  enabled: boolean;
  address: string;
}

export interface MidiMapping {
  enabled: boolean;
  channel: number;
  note: number;
  cc: number;
  ccY?: number;
  octaves?: number;
  velocity?: number;
}

export function controlOutputsFromLegacyProtocol(protocol: ControlProtocol): {
  oscEnabled: boolean;
  midiEnabled: boolean;
  mqttEnabled: boolean;
} {
  return {
    oscEnabled: protocol === "osc" || protocol === "both",
    midiEnabled: protocol === "midi" || protocol === "both",
    mqttEnabled: protocol === "mqtt",
  };
}

export interface ControlLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface LayoutSettings {
  gridSize: number;
}

export type SliderOrientation = "horizontal" | "vertical";

export interface ControlTab {
  id: string;
  label: string;
}

export interface TabDropPreview {
  tabsControlId: string;
  tabId: string;
  x: number;
  y: number;
  sourceControlId?: string;
}

export interface Control {
  id: string;
  type: ControlType;
  label: string;
  color?: string | null;
  sliderOrientation?: SliderOrientation;
  tabs?: ControlTab[];
  parentId?: string;
  tabId?: string;
  oscSenderId?: string | null;
  midiOutputId?: string | null;
  oscReceiverId?: string | null;
  midiInputId?: string | null;
  mqttConnectionId?: string | null;
  osc: OscMapping;
  midi: MidiMapping;
  mqtt: MqttMapping;
  layout: ControlLayout;
}

export const CONTROL_COLOR_PRESETS = [
  "#f44336",
  "#ff9800",
  "#ffeb3b",
  "#4caf50",
  "#2196f3",
  "#9c27b0",
  "#e91e63",
  "#00bcd4",
] as const;

export function isValidControlColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export interface ControlPadValue {
  x: number;
  y: number;
}

export const DEFAULT_CONTROL_PAD_VALUE: ControlPadValue = { x: 50, y: 50 };
