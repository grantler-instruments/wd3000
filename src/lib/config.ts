import {
  Control,
  ControlLayout,
  ControlProtocol,
  ControlTab,
  ControlType,
  KEYBOARD_DEFAULT_OCTAVES,
  KEYBOARD_DEFAULT_VELOCITY,
  KEYBOARD_MAX_OCTAVES,
  KEYBOARD_MIN_OCTAVES,
  LayoutSettings,
  OutputConfig,
  PerformerIoConfig,
  SliderOrientation,
  createControlLayout,
  createDefaultTabs,
  defaultLayoutSettings,
  defaultOutputConfig,
  defaultPerformerIoConfig,
  isValidControlColor,
} from "../types";

export const CONFIG_EXPORT_VERSION = 1;
export const CONFIG_APP_ID = "wd3000";

export interface PersistedAppConfig {
  controls: Control[];
  output: OutputConfig;
  performerIo: PerformerIoConfig;
  layoutSettings: LayoutSettings;
}

export interface AppConfigExport {
  version: number;
  app: typeof CONFIG_APP_ID;
  exportedAt: string;
  config: PersistedAppConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSliderOrientation(value: unknown): value is SliderOrientation {
  return value === "horizontal" || value === "vertical";
}

function isControlType(value: unknown): value is ControlType {
  return (
    value === "button" ||
    value === "slider" ||
    value === "keyboard" ||
    value === "pad" ||
    value === "tabs"
  );
}

function parseControlTabs(value: unknown): ControlTab[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tabs = value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      if (!label) {
        return null;
      }

      return {
        id:
          typeof entry.id === "string" && entry.id.length > 0
            ? entry.id
            : crypto.randomUUID(),
        label,
      };
    })
    .filter((tab): tab is ControlTab => tab !== null);

  return tabs.length > 0 ? tabs : undefined;
}

function isControlProtocol(value: unknown): value is ControlProtocol {
  return value === "osc" || value === "midi" || value === "both";
}

function parseLayoutSettings(value: unknown): LayoutSettings {
  const defaults = defaultLayoutSettings();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    gridSize: typeof value.gridSize === "number" ? value.gridSize : defaults.gridSize,
  };
}

function parseControlLayout(value: unknown, index: number): ControlLayout {
  const defaults = createControlLayout(index);
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    x: typeof value.x === "number" ? value.x : defaults.x,
    y: typeof value.y === "number" ? value.y : defaults.y,
    width: typeof value.width === "number" ? value.width : defaults.width,
    height: typeof value.height === "number" ? value.height : defaults.height,
    order: typeof value.order === "number" ? value.order : index,
  };
}

function parseControl(value: unknown, index: number, legacyProtocol: ControlProtocol): Control {
  if (!isRecord(value) || !isControlType(value.type)) {
    throw new Error(`Control ${index + 1} is invalid.`);
  }

  const osc = isRecord(value.osc) ? value.osc : {};
  const midi = isRecord(value.midi) ? value.midi : {};

  const color =
    value.color === null
      ? null
      : typeof value.color === "string" && isValidControlColor(value.color)
        ? value.color
        : undefined;

  return {
    id: typeof value.id === "string" && value.id.length > 0 ? value.id : crypto.randomUUID(),
    type: value.type,
    label:
      typeof value.label === "string"
        ? value.label
        : value.type === "button"
          ? "Button"
          : value.type === "slider"
            ? "Slider"
            : value.type === "pad"
              ? "Pad"
              : value.type === "tabs"
                ? "Tabs"
                : "Keyboard",
    ...(color !== undefined ? { color } : {}),
    ...(value.type === "slider" && isSliderOrientation(value.sliderOrientation)
      ? { sliderOrientation: value.sliderOrientation }
      : {}),
    ...(value.type === "tabs"
      ? { tabs: parseControlTabs(value.tabs) ?? createDefaultTabs() }
      : {}),
    ...(typeof value.parentId === "string" && value.parentId.length > 0
      ? { parentId: value.parentId }
      : {}),
    ...(typeof value.tabId === "string" && value.tabId.length > 0
      ? { tabId: value.tabId }
      : {}),
    ...(typeof value.oscSenderId === "string" ? { oscSenderId: value.oscSenderId } : {}),
    ...(typeof value.midiOutputId === "string" ? { midiOutputId: value.midiOutputId } : {}),
    ...(typeof value.oscReceiverId === "string" ? { oscReceiverId: value.oscReceiverId } : {}),
    ...(typeof value.midiInputId === "string" ? { midiInputId: value.midiInputId } : {}),
    ...(value.oscSenderId === null ? { oscSenderId: null } : {}),
    ...(value.midiOutputId === null ? { midiOutputId: null } : {}),
    ...(value.oscReceiverId === null ? { oscReceiverId: null } : {}),
    ...(value.midiInputId === null ? { midiInputId: null } : {}),
    protocol: isControlProtocol(value.protocol) ? value.protocol : legacyProtocol,
    osc: {
      address:
        typeof osc.address === "string"
          ? osc.address
          : value.type === "button"
            ? "/button"
            : value.type === "slider"
              ? "/slider"
              : value.type === "pad"
                ? "/pad"
                : value.type === "tabs"
                  ? "/tabs"
                  : "/keyboard",
    },
    midi: {
      channel: typeof midi.channel === "number" ? midi.channel : 1,
      note: typeof midi.note === "number" ? midi.note : value.type === "keyboard" ? 48 : 60,
      cc: typeof midi.cc === "number" ? midi.cc : index,
      ...(value.type === "keyboard"
        ? {
            octaves:
              typeof midi.octaves === "number"
                ? Math.min(
                    KEYBOARD_MAX_OCTAVES,
                    Math.max(KEYBOARD_MIN_OCTAVES, midi.octaves),
                  )
                : KEYBOARD_DEFAULT_OCTAVES,
            velocity:
              typeof midi.velocity === "number"
                ? Math.min(127, Math.max(1, midi.velocity))
                : KEYBOARD_DEFAULT_VELOCITY,
          }
        : {}),
      ...(value.type === "pad"
        ? {
            ccY:
              typeof midi.ccY === "number"
                ? Math.min(127, Math.max(0, midi.ccY))
                : (typeof midi.cc === "number" ? midi.cc : index) + 1,
          }
        : {}),
    },
    layout: parseControlLayout(value.layout, index),
  };
}

function parsePerformerIoConfig(value: unknown, output: OutputConfig): PerformerIoConfig {
  if (!isRecord(value)) {
    return defaultPerformerIoConfig(output);
  }

  const parseOscSenders = (): PerformerIoConfig["oscSenders"] => {
    if (!Array.isArray(value.oscSenders)) {
      return defaultPerformerIoConfig(output).oscSenders;
    }

    return value.oscSenders
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        if (!name) {
          return null;
        }

        return {
          id:
            typeof entry.id === "string" && entry.id.length > 0
              ? entry.id
              : crypto.randomUUID(),
          name,
          host: typeof entry.host === "string" ? entry.host : "127.0.0.1",
          port: typeof entry.port === "number" ? entry.port : 9000,
        };
      })
      .filter((sender): sender is PerformerIoConfig["oscSenders"][number] => sender !== null);
  };

  const parseOscReceivers = (): PerformerIoConfig["oscReceivers"] => {
    if (!Array.isArray(value.oscReceivers)) {
      return defaultPerformerIoConfig(output).oscReceivers;
    }

    return value.oscReceivers
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        if (!name) {
          return null;
        }

        return {
          id:
            typeof entry.id === "string" && entry.id.length > 0
              ? entry.id
              : crypto.randomUUID(),
          name,
          port: typeof entry.port === "number" ? entry.port : 9001,
        };
      })
      .filter(
        (receiver): receiver is PerformerIoConfig["oscReceivers"][number] => receiver !== null,
      );
  };

  const parseMidiOutputs = (): PerformerIoConfig["midiOutputs"] => {
    if (!Array.isArray(value.midiOutputs)) {
      return defaultPerformerIoConfig(output).midiOutputs;
    }

    return value.midiOutputs
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        if (!name) {
          return null;
        }

        return {
          id:
            typeof entry.id === "string" && entry.id.length > 0
              ? entry.id
              : crypto.randomUUID(),
          name,
          portName: typeof entry.portName === "string" ? entry.portName : "",
        };
      })
      .filter(
        (endpoint): endpoint is PerformerIoConfig["midiOutputs"][number] => endpoint !== null,
      );
  };

  const parseMidiInputs = (): PerformerIoConfig["midiInputs"] => {
    if (!Array.isArray(value.midiInputs)) {
      return defaultPerformerIoConfig(output).midiInputs;
    }

    return value.midiInputs
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        if (!name) {
          return null;
        }

        return {
          id:
            typeof entry.id === "string" && entry.id.length > 0
              ? entry.id
              : crypto.randomUUID(),
          name,
          portName: typeof entry.portName === "string" ? entry.portName : "",
        };
      })
      .filter(
        (endpoint): endpoint is PerformerIoConfig["midiInputs"][number] => endpoint !== null,
      );
  };

  const performerIo: PerformerIoConfig = {
    oscSenders: parseOscSenders(),
    oscReceivers: parseOscReceivers(),
    midiOutputs: parseMidiOutputs(),
    midiInputs: parseMidiInputs(),
  };

  if (
    performerIo.oscSenders.length === 0 &&
    performerIo.oscReceivers.length === 0 &&
    performerIo.midiOutputs.length === 0 &&
    performerIo.midiInputs.length === 0
  ) {
    return defaultPerformerIoConfig(output);
  }

  return performerIo;
}

function parseOutputConfig(value: unknown): OutputConfig {
  const defaults = defaultOutputConfig();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    oscHost: typeof value.oscHost === "string" ? value.oscHost : defaults.oscHost,
    oscPort: typeof value.oscPort === "number" ? value.oscPort : defaults.oscPort,
    oscListenPort:
      typeof value.oscListenPort === "number" ? value.oscListenPort : defaults.oscListenPort,
    mqttBrokerPort:
      typeof value.mqttBrokerPort === "number" ? value.mqttBrokerPort : defaults.mqttBrokerPort,
    mqttBrokerWsPort:
      typeof value.mqttBrokerWsPort === "number" ? value.mqttBrokerWsPort : defaults.mqttBrokerWsPort,
    mqttBrokerEnabled:
      typeof value.mqttBrokerEnabled === "boolean"
        ? value.mqttBrokerEnabled
        : defaults.mqttBrokerEnabled,
    mqttSubscribeTopics: Array.isArray(value.mqttSubscribeTopics)
      ? value.mqttSubscribeTopics.filter((topic): topic is string => typeof topic === "string")
      : typeof value.mqttSubscribeFilter === "string" && value.mqttSubscribeFilter.trim()
        ? [value.mqttSubscribeFilter]
        : defaults.mqttSubscribeTopics,
    mqttComposerHost:
      typeof value.mqttComposerHost === "string"
        ? value.mqttComposerHost
        : defaults.mqttComposerHost,
    mqttComposerPort:
      typeof value.mqttComposerPort === "number"
        ? value.mqttComposerPort
        : defaults.mqttComposerPort,
    mqttComposerProtocol:
      value.mqttComposerProtocol === "tcp" || value.mqttComposerProtocol === "ws"
        ? value.mqttComposerProtocol
        : defaults.mqttComposerProtocol,
    midiPortName:
      typeof value.midiPortName === "string"
        ? value.midiPortName
        : value.midiPortName === null
          ? null
          : defaults.midiPortName,
    midiInputPortName:
      typeof value.midiInputPortName === "string"
        ? value.midiInputPortName
        : value.midiInputPortName === null
          ? null
          : defaults.midiInputPortName,
  };
}

function legacyProtocolFromOutput(value: unknown): ControlProtocol {
  if (isRecord(value) && isControlProtocol(value.protocol)) {
    return value.protocol;
  }

  return "osc";
}

function parsePersistedConfig(value: unknown): PersistedAppConfig {
  if (!isRecord(value)) {
    throw new Error("Config must be a JSON object.");
  }

  const output = parseOutputConfig(value.output);
  const legacyProtocol = legacyProtocolFromOutput(value.output);
  const rawControls = Array.isArray(value.controls) ? value.controls : [];

  return {
    controls: rawControls.map((control, index) => parseControl(control, index, legacyProtocol)),
    output,
    performerIo: parsePerformerIoConfig(value.performerIo, output),
    layoutSettings: parseLayoutSettings(value.layoutSettings),
  };
}

export function createConfigExport(config: PersistedAppConfig): AppConfigExport {
  return {
    version: CONFIG_EXPORT_VERSION,
    app: CONFIG_APP_ID,
    exportedAt: new Date().toISOString(),
    config,
  };
}

export function serializeConfigExport(config: PersistedAppConfig): string {
  return `${JSON.stringify(createConfigExport(config), null, 2)}\n`;
}

export function parseConfigImport(raw: string): PersistedAppConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Config must be a JSON object.");
  }

  if ("config" in parsed) {
    if (parsed.app !== undefined && parsed.app !== CONFIG_APP_ID) {
      throw new Error("This file is not a WD3000 config.");
    }

    return parsePersistedConfig(parsed.config);
  }

  return parsePersistedConfig(parsed);
}

export function exportConfigToFile(config: PersistedAppConfig): void {
  const blob = new Blob([serializeConfigExport(config)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  anchor.href = url;
  anchor.download = `wd3000-config-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
