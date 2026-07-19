import { type Control, controlTabs, KEYBOARD_DEFAULT_OCTAVES } from "../types";

export interface OscInputMessage {
  address: string;
  value: number;
}

export interface MidiNoteInputMessage {
  channel: number;
  note: number;
  velocity: number;
}

export interface MidiCcInputMessage {
  channel: number;
  cc: number;
  value: number;
}

export interface MidiProgramChangeInputMessage {
  channel: number;
  program: number;
}

export interface MidiPitchBendInputMessage {
  channel: number;
  value: number;
}

export interface MidiChannelPressureInputMessage {
  channel: number;
  pressure: number;
}

export interface MidiPolyPressureInputMessage {
  channel: number;
  note: number;
  pressure: number;
}

function oscValueToControlValue(value: number): number {
  if (value <= 1 && value >= 0) {
    return Math.round(value * 100);
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function oscValueToTabIndex(value: number, tabCount: number): number {
  if (tabCount <= 1) {
    return 0;
  }

  if (value <= 1 && value >= 0) {
    return Math.round(value * (tabCount - 1));
  }

  return Math.min(tabCount - 1, Math.max(0, Math.round(value)));
}

function midiCcToTabIndex(value: number, tabCount: number): number {
  if (tabCount <= 1) {
    return 0;
  }

  return Math.round((Math.min(127, Math.max(0, value)) / 127) * (tabCount - 1));
}

function midiCcToControlValue(value: number): number {
  return Math.round((Math.min(127, Math.max(0, value)) / 127) * 100);
}

function matchesOsc(control: Control, address: string): boolean {
  return control.osc.enabled && control.osc.address === address;
}

export interface ControlValueUpdate {
  controlId: string;
  value: number;
}

export interface ControlNoteUpdate {
  controlId: string;
  note: number;
  active: boolean;
}

export interface ControlPadUpdate {
  controlId: string;
  axis: "x" | "y";
  value: number;
}

export interface ControlTabUpdate {
  controlId: string;
  tabIndex: number;
}

export type ControlInputUpdate =
  | ControlValueUpdate
  | ControlNoteUpdate
  | ControlPadUpdate
  | ControlTabUpdate;

function isKeyboardNoteInRange(control: Control, note: number): boolean {
  if (control.type !== "keyboard") {
    return false;
  }

  const octaves = control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES;
  const start = control.midi.note;
  const end = start + octaves * 12 - 1;
  return note >= start && note <= end;
}

function matchesMidiNote(control: Control, channel: number, note: number): boolean {
  if (!control.midi.enabled) {
    return false;
  }

  if (control.midi.channel !== channel) {
    return false;
  }

  if (control.type === "button") {
    return control.midi.note === note;
  }

  return isKeyboardNoteInRange(control, note);
}

function matchesMidiCc(control: Control, channel: number, cc: number): boolean {
  if (!control.midi.enabled) {
    return false;
  }

  if (control.midi.channel !== channel) {
    return false;
  }

  if (control.type === "pad") {
    const ccY = control.midi.ccY ?? control.midi.cc + 1;
    return control.midi.cc === cc || ccY === cc;
  }

  return control.type === "slider" || control.type === "tabs" ? control.midi.cc === cc : false;
}

function matchesPadOsc(control: Control, address: string): "x" | "y" | null {
  if (control.type !== "pad" || !control.osc.enabled) {
    return null;
  }

  if (address === `${control.osc.address}/x`) {
    return "x";
  }

  if (address === `${control.osc.address}/y`) {
    return "y";
  }

  return null;
}

export function routeOscMessage(
  controls: Control[],
  message: OscInputMessage,
): ControlInputUpdate[] {
  const updates: ControlInputUpdate[] = [];

  for (const control of controls) {
    const padAxis = matchesPadOsc(control, message.address);
    if (padAxis) {
      updates.push({
        controlId: control.id,
        axis: padAxis,
        value: oscValueToControlValue(message.value),
      });
      continue;
    }

    if (!matchesOsc(control, message.address)) {
      continue;
    }

    if (control.type === "button") {
      updates.push({
        controlId: control.id,
        value: message.value >= 0.5 ? 100 : 0,
      });
    } else if (control.type === "tabs") {
      updates.push({
        controlId: control.id,
        tabIndex: oscValueToTabIndex(message.value, controlTabs(control).length),
      });
    } else if (control.type !== "pad") {
      updates.push({
        controlId: control.id,
        value: oscValueToControlValue(message.value),
      });
    }
  }

  return updates;
}

export function routeMidiNoteMessage(
  controls: Control[],
  message: MidiNoteInputMessage,
): ControlInputUpdate[] {
  const updates: ControlInputUpdate[] = [];

  for (const control of controls) {
    if (!matchesMidiNote(control, message.channel, message.note)) {
      continue;
    }

    if (control.type === "keyboard") {
      updates.push({
        controlId: control.id,
        note: message.note,
        active: message.velocity > 0,
      });
      continue;
    }

    updates.push({
      controlId: control.id,
      value: message.velocity > 0 ? 100 : 0,
    });
  }

  return updates;
}

export function routeMidiCcMessage(
  controls: Control[],
  message: MidiCcInputMessage,
): ControlInputUpdate[] {
  const updates: ControlInputUpdate[] = [];

  for (const control of controls) {
    if (!matchesMidiCc(control, message.channel, message.cc)) {
      continue;
    }

    if (control.type === "pad") {
      const ccY = control.midi.ccY ?? control.midi.cc + 1;
      updates.push({
        controlId: control.id,
        axis: message.cc === ccY ? "y" : "x",
        value: midiCcToControlValue(message.value),
      });
      continue;
    }

    if (control.type === "tabs") {
      updates.push({
        controlId: control.id,
        tabIndex: midiCcToTabIndex(message.value, controlTabs(control).length),
      });
      continue;
    }

    updates.push({
      controlId: control.id,
      value: midiCcToControlValue(message.value),
    });
  }

  return updates;
}
