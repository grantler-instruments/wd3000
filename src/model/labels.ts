import i18n from "../i18n";
import type { Control, ControlType } from "./control";
import {
  findMidiOutputEndpoint,
  findMqttConnection,
  findOscSender,
  type PerformerIoConfig,
} from "./io";
import { KEYBOARD_DEFAULT_OCTAVES } from "./layout";

export function controlTypeLabel(type: ControlType): string {
  switch (type) {
    case "button":
      return i18n.t("controlTypes.button");
    case "switch":
      return i18n.t("controlTypes.switch");
    case "slider":
      return i18n.t("controlTypes.slider");
    case "rotary":
      return i18n.t("controlTypes.rotary");
    case "keyboard":
      return i18n.t("controlTypes.keyboard");
    case "pad":
      return i18n.t("controlTypes.pad");
    case "tabs":
      return i18n.t("controlTypes.tabs");
  }
}

export function controlMappingLabel(control: Control, performerIo?: PerformerIoConfig): string {
  const parts: string[] = [];

  if (control.osc.enabled) {
    const sender = performerIo ? findOscSender(performerIo, control.oscSenderId) : null;
    if (sender) {
      parts.push(`${sender.name}: ${control.osc.address}`);
    } else {
      parts.push(control.osc.address);
    }
  }

  if (control.midi.enabled) {
    const midiPrefix = performerIo
      ? findMidiOutputEndpoint(performerIo, control.midiOutputId)?.name
      : null;
    const prefix = midiPrefix ? `${midiPrefix} · ` : "";

    if (control.type === "button" || control.type === "switch") {
      parts.push(`${prefix}Ch${control.midi.channel} N${control.midi.note}`);
    } else if (control.type === "keyboard") {
      const octaves = control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES;
      const end = control.midi.note + octaves * 12 - 1;
      parts.push(`${prefix}Ch${control.midi.channel} ${control.midi.note}–${end}`);
    } else if (control.type === "pad") {
      const ccY = control.midi.ccY ?? control.midi.cc + 1;
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}/CC${ccY}`);
    } else if (control.type === "tabs") {
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}`);
    } else {
      parts.push(`${prefix}Ch${control.midi.channel} CC${control.midi.cc}`);
    }
  }

  if (control.mqtt.enabled) {
    const connection = performerIo
      ? findMqttConnection(performerIo, control.mqttConnectionId)
      : null;
    if (connection) {
      parts.push(`${connection.name}: ${control.mqtt.topic}`);
    } else {
      parts.push(control.mqtt.topic);
    }
  }

  return parts.join(" · ");
}

export function controlActiveProtocolLabels(control: Control): string[] {
  return [
    control.osc.enabled ? i18n.t("protocols.osc") : null,
    control.midi.enabled ? i18n.t("protocols.midi") : null,
    control.mqtt.enabled ? i18n.t("protocols.mqtt") : null,
  ].filter((label): label is string => label !== null);
}
