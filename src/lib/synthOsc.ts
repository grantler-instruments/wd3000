import type { SynthParams, Waveform } from "../audio/instruments/Synth";
import type { OscArgPayload } from "./oscMessages";

export type SynthOscAction =
  | { type: "noteOn"; channel: number; note: number; velocity: number }
  | { type: "noteOff"; channel: number; note: number }
  | { type: "allNotesOff" }
  | { type: "gain"; value: number }
  | { type: "param"; key: keyof SynthParams; value: number | Waveform };

function numericArgs(args: OscArgPayload[]): number[] {
  return args
    .map((arg) => {
      if (typeof arg.value === "number") {
        return arg.value;
      }
      if (typeof arg.value === "string") {
        const parsed = Number(arg.value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    })
    .filter((value): value is number => value !== null);
}

function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim() || "/synth";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function isWaveform(value: string): value is Waveform {
  return value === "sine" || value === "saw" || value === "square" || value === "triangle";
}

/**
 * Map OSC messages to synth actions.
 *
 * Supported (prefix defaults to `/synth`):
 * - `/synth/noteOn` note [velocity] [channel]
 * - `/synth/noteOff` note [channel]
 * - `/synth/note` note velocity  (velocity 0 = off)
 * - `/synth/allNotesOff`
 * - `/synth/gain` 0..1
 * - `/synth/attack|decay|sustain|release|amplitudeA|...` float
 * - `/synth/waveformA|B|C` string arg or int 0..3
 */
export function parseSynthOscMessage(
  address: string,
  args: OscArgPayload[],
  addressPrefix: string,
): SynthOscAction | null {
  const prefix = normalizePrefix(addressPrefix);
  if (address !== prefix && !address.startsWith(`${prefix}/`)) {
    return null;
  }

  const path = address === prefix ? "" : address.slice(prefix.length + 1);
  const nums = numericArgs(args);
  const stringArg = args.find((arg) => typeof arg.value === "string")?.value as string | undefined;

  switch (path) {
    case "noteOn": {
      const note = nums[0];
      if (note === undefined) {
        return null;
      }
      return {
        type: "noteOn",
        note: Math.round(note),
        velocity: nums[1] !== undefined ? Math.round(nums[1]) : 100,
        channel: nums[2] !== undefined ? Math.round(nums[2]) : 1,
      };
    }
    case "noteOff": {
      const note = nums[0];
      if (note === undefined) {
        return null;
      }
      return {
        type: "noteOff",
        note: Math.round(note),
        channel: nums[1] !== undefined ? Math.round(nums[1]) : 1,
      };
    }
    case "note": {
      const note = nums[0];
      const velocity = nums[1] ?? 0;
      if (note === undefined) {
        return null;
      }
      if (velocity <= 0) {
        return { type: "noteOff", note: Math.round(note), channel: 1 };
      }
      return {
        type: "noteOn",
        note: Math.round(note),
        velocity: Math.round(velocity),
        channel: 1,
      };
    }
    case "allNotesOff":
      return { type: "allNotesOff" };
    case "gain": {
      const value = nums[0];
      if (value === undefined) {
        return null;
      }
      return { type: "gain", value: value > 1 ? value / 127 : value };
    }
    case "attack":
    case "decay":
    case "sustain":
    case "release":
    case "amplitudeA":
    case "amplitudeB":
    case "amplitudeC":
    case "detuneA":
    case "detuneB":
    case "detuneC": {
      const value = nums[0];
      if (value === undefined) {
        return null;
      }
      return { type: "param", key: path, value };
    }
    case "waveformA":
    case "waveformB":
    case "waveformC": {
      if (stringArg && isWaveform(stringArg)) {
        return { type: "param", key: path, value: stringArg };
      }
      const waveforms: Waveform[] = ["sine", "saw", "square", "triangle"];
      const index = nums[0];
      if (index === undefined) {
        return null;
      }
      return {
        type: "param",
        key: path,
        value: waveforms[Math.round(index) % waveforms.length],
      };
    }
    default:
      return null;
  }
}
