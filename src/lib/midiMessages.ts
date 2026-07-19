import type { MidiComposerType, MidiDebugKind } from "./midiTypes";
import { midiComposerDebugKind } from "./midiTypes";

export const PITCH_BEND_MIN = -8192;
export const PITCH_BEND_MAX = 8191;
export const PITCH_BEND_CENTER = 0;

export interface MidiComposerParams {
  channel: number;
  noteOrCc: number;
  velocityOrValue: number;
  pitchBendSigned: number;
  manufacturerId: string;
  sysexData: string;
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampChannel(value: number) {
  return clamp(value, 1, 16, 1);
}

function clampMidi(value: number, fallback = 0) {
  return clamp(value, 0, 127, fallback);
}

function channelStatus(base: number, channel: number) {
  return base | ((clampChannel(channel) - 1) & 0x0f);
}

export function hexStringToBytes(hex: string): number[] {
  const clean = hex.replace(/\s+/g, "").toUpperCase();
  if (!clean) {
    return [];
  }

  if (!/^[0-9A-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Invalid hex data");
  }

  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 2) {
    const value = Number.parseInt(clean.slice(index, index + 2), 16);
    bytes.push(value & 0x7f);
  }

  return bytes;
}

export function formatHexBytes(bytes: number[]) {
  return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

function encodeSysex(params: MidiComposerParams) {
  const manufacturer = params.manufacturerId.trim();
  const data = hexStringToBytes(params.sysexData);

  if (!manufacturer && data.length === 0) {
    throw new Error("SysEx manufacturer ID or data is required");
  }

  const bytes = [0xf0];

  if (manufacturer) {
    const manufacturerByte = Number.parseInt(manufacturer, 16);
    if (Number.isNaN(manufacturerByte) || manufacturerByte < 0 || manufacturerByte > 127) {
      throw new Error("Invalid manufacturer ID");
    }
    bytes.push(manufacturerByte);
  }

  bytes.push(...data, 0xf7);
  return bytes;
}

export function encodeMidiComposerMessage(
  type: MidiComposerType,
  params: MidiComposerParams,
): number[] {
  switch (type) {
    case "note-on":
      return [
        channelStatus(0x90, params.channel),
        clampMidi(params.noteOrCc, 60),
        clampMidi(params.velocityOrValue, 100) || 1,
      ];
    case "note-off":
      return [
        channelStatus(0x80, params.channel),
        clampMidi(params.noteOrCc, 60),
        clampMidi(params.velocityOrValue, 0),
      ];
    case "cc":
      return [
        channelStatus(0xb0, params.channel),
        clampMidi(params.noteOrCc, 1),
        clampMidi(params.velocityOrValue, 0),
      ];
    case "program-change":
      return [channelStatus(0xc0, params.channel), clampMidi(params.noteOrCc, 0)];
    case "pitch-bend": {
      const signed = clamp(
        params.pitchBendSigned,
        PITCH_BEND_MIN,
        PITCH_BEND_MAX,
        PITCH_BEND_CENTER,
      );
      const value = signed + 8192;
      return [channelStatus(0xe0, params.channel), value & 0x7f, (value >> 7) & 0x7f];
    }
    case "channel-pressure":
      return [channelStatus(0xd0, params.channel), clampMidi(params.velocityOrValue, 0)];
    case "poly-pressure":
      return [
        channelStatus(0xa0, params.channel),
        clampMidi(params.noteOrCc, 60),
        clampMidi(params.velocityOrValue, 0),
      ];
    case "sysex":
      return encodeSysex(params);
    case "start":
      return [0xfa];
    case "stop":
      return [0xfc];
    case "continue":
      return [0xfb];
  }
}

export function formatMidiComposerSummary(
  type: MidiComposerType,
  params: MidiComposerParams,
  bytes: number[],
) {
  const channel = clampChannel(params.channel);

  switch (type) {
    case "note-on":
      return `Ch${channel} Note On ${clampMidi(params.noteOrCc, 60)} vel ${clampMidi(params.velocityOrValue, 100)}`;
    case "note-off":
      return `Ch${channel} Note Off ${clampMidi(params.noteOrCc, 60)} vel ${clampMidi(params.velocityOrValue, 0)}`;
    case "cc":
      return `Ch${channel} CC${clampMidi(params.noteOrCc, 1)} → ${clampMidi(params.velocityOrValue, 0)}`;
    case "program-change":
      return `Ch${channel} Program ${clampMidi(params.noteOrCc, 0)}`;
    case "pitch-bend":
      return `Ch${channel} Pitch Bend ${clamp(params.pitchBendSigned, PITCH_BEND_MIN, PITCH_BEND_MAX, PITCH_BEND_CENTER)}`;
    case "channel-pressure":
      return `Ch${channel} Pressure ${clampMidi(params.velocityOrValue, 0)}`;
    case "poly-pressure":
      return `Ch${channel} Note ${clampMidi(params.noteOrCc, 60)} pressure ${clampMidi(params.velocityOrValue, 0)}`;
    case "sysex":
      return `SysEx ${formatHexBytes(bytes)}`;
    case "start":
      return "Start";
    case "stop":
      return "Stop";
    case "continue":
      return "Continue";
  }
}

export function getMidiComposerDebugKind(type: MidiComposerType): MidiDebugKind {
  return midiComposerDebugKind(type);
}

export const defaultMidiComposerParams = (): MidiComposerParams => ({
  channel: 1,
  noteOrCc: 60,
  velocityOrValue: 100,
  pitchBendSigned: 0,
  manufacturerId: "",
  sysexData: "",
});
