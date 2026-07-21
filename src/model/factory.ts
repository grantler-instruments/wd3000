import i18n from "../i18n";
import type { Control, ControlTab, ControlType, MqttMapping } from "./control";
import {
  defaultControlIoAssignments,
  defaultPerformerIoConfig,
  type PerformerIoConfig,
} from "./io";
import {
  createControlLayoutForType,
  KEYBOARD_DEFAULT_OCTAVES,
  KEYBOARD_DEFAULT_VELOCITY,
} from "./layout";

export function createDefaultTabs(): ControlTab[] {
  return [
    { id: crypto.randomUUID(), label: i18n.t("control.tabN", { n: 1 }) },
    { id: crypto.randomUUID(), label: i18n.t("control.tabN", { n: 2 }) },
  ];
}

export function controlTabs(control: Control): ControlTab[] {
  return control.tabs ?? createDefaultTabs();
}

function controlLabel(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return i18n.t("controlTypes.buttonN", { n: index });
    case "switch":
      return i18n.t("controlTypes.switchN", { n: index });
    case "slider":
      return i18n.t("controlTypes.sliderN", { n: index });
    case "rotary":
      return i18n.t("controlTypes.rotaryN", { n: index });
    case "keyboard":
      return i18n.t("controlTypes.keyboardN", { n: index });
    case "pad":
      return i18n.t("controlTypes.padN", { n: index });
    case "tabs":
      return i18n.t("controlTypes.tabsN", { n: index });
  }
}

function controlMqttTopic(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return `button/${index}`;
    case "switch":
      return `switch/${index}`;
    case "slider":
      return `slider/${index}`;
    case "rotary":
      return `rotary/${index}`;
    case "keyboard":
      return `keyboard/${index}`;
    case "pad":
      return `pad/${index}`;
    case "tabs":
      return `tabs/${index}`;
  }
}

export function defaultMqttMapping(type: ControlType, index: number, enabled = false): MqttMapping {
  return {
    enabled,
    topic: controlMqttTopic(type, index),
    qos: 0,
    retain: false,
  };
}

function controlOscAddress(type: ControlType, index: number): string {
  switch (type) {
    case "button":
      return `/button/${index}`;
    case "switch":
      return `/switch/${index}`;
    case "slider":
      return `/slider/${index}`;
    case "rotary":
      return `/rotary/${index}`;
    case "keyboard":
      return `/keyboard/${index}`;
    case "pad":
      return `/pad/${index}`;
    case "tabs":
      return `/tabs/${index}`;
  }
}

export const createControl = (
  type: ControlType,
  index: number,
  layoutIndex: number,
  performerIo?: PerformerIoConfig,
): Control => {
  const midiDefault = type === "keyboard" || type === "pad";
  const io = performerIo ?? defaultPerformerIoConfig();

  return {
    id: crypto.randomUUID(),
    type,
    label: controlLabel(type, index),
    ...defaultControlIoAssignments(io),
    osc: {
      enabled: !midiDefault,
      address: controlOscAddress(type, index),
    },
    mqtt: defaultMqttMapping(type, index, false),
    midi: {
      enabled: midiDefault,
      channel: 1,
      note: type === "keyboard" ? 48 : 60 + index,
      cc: type === "pad" ? index * 2 - 1 : index,
      ...(type === "keyboard"
        ? {
            octaves: KEYBOARD_DEFAULT_OCTAVES,
            velocity: KEYBOARD_DEFAULT_VELOCITY,
          }
        : {}),
      ...(type === "pad" ? { ccY: index * 2 } : {}),
    },
    ...(type === "tabs" ? { tabs: createDefaultTabs() } : {}),
    layout: createControlLayoutForType(type, layoutIndex),
  };
};
