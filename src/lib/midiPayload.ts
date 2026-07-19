import type { MidiMonitorPayload } from "./debugLog";

function channelStatus(base: number, channel: number) {
  return base | ((Math.min(16, Math.max(1, channel)) - 1) & 0x0f);
}

export function midiNoteOnBytes(channel: number, note: number, velocity: number): number[] {
  return [channelStatus(0x90, channel), note & 0x7f, velocity & 0x7f];
}

export function midiNoteOffBytes(channel: number, note: number, velocity: number): number[] {
  return [channelStatus(0x80, channel), note & 0x7f, velocity & 0x7f];
}

export function midiCcBytes(channel: number, cc: number, value: number): number[] {
  return [channelStatus(0xb0, channel), cc & 0x7f, value & 0x7f];
}

export function midiProgramChangeBytes(channel: number, program: number): number[] {
  return [channelStatus(0xc0, channel), program & 0x7f];
}

export function midiPitchBendBytes(channel: number, value: number): number[] {
  const clamped = Math.min(16383, Math.max(0, value));
  return [channelStatus(0xe0, channel), clamped & 0x7f, (clamped >> 7) & 0x7f];
}

export function midiChannelPressureBytes(channel: number, pressure: number): number[] {
  return [channelStatus(0xd0, channel), pressure & 0x7f];
}

export function midiPolyPressureBytes(channel: number, note: number, pressure: number): number[] {
  return [channelStatus(0xa0, channel), note & 0x7f, pressure & 0x7f];
}

export function asMidiPayload(bytes: number[]): MidiMonitorPayload {
  return { bytes };
}
