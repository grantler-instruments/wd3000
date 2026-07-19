import type { DebugLogKind } from "./debugLog";
import type { MidiCcInputMessage, MidiNoteInputMessage } from "./inputRouter";

function formatHex(bytes: number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export interface ParsedMidiInput {
  controlNote?: MidiNoteInputMessage;
  controlCc?: MidiCcInputMessage;
  debug: {
    kind: DebugLogKind;
    summary: string;
    bytes: number[];
  };
}

function debugEntry(kind: DebugLogKind, summary: string, bytes: number[]): ParsedMidiInput {
  return { debug: { kind, summary, bytes } };
}

function noteEntry(
  channel: number,
  note: number,
  velocity: number,
  bytes: number[],
): ParsedMidiInput {
  const summary =
    velocity === 0
      ? `Ch${channel} Note Off ${note} vel 0`
      : `Ch${channel} Note On ${note} vel ${velocity}`;

  return {
    controlNote: { channel, note, velocity },
    debug: {
      kind: "midi-note",
      summary,
      bytes,
    },
  };
}

function ccEntry(channel: number, cc: number, value: number, bytes: number[]): ParsedMidiInput {
  return {
    controlCc: { channel, cc, value },
    debug: {
      kind: "midi-cc",
      summary: `Ch${channel} CC${cc} → ${value}`,
      bytes,
    },
  };
}

export function parseMidiInput(message: number[]): ParsedMidiInput | null {
  if (message.length === 0) {
    return null;
  }

  const status = message[0];

  if (status >= 0xf0) {
    switch (status) {
      case 0xf0:
        return debugEntry("midi-sysex", `SysEx ${formatHex(message)}`, message);
      case 0xf1:
        if (message.length >= 2) {
          return debugEntry("midi-mtc", `MTC Quarter Frame ${message[1]}`, message);
        }
        break;
      case 0xf2:
        if (message.length >= 3) {
          const position = (message[2] << 7) | message[1];
          return debugEntry("midi-song-position", `Song Position ${position}`, message);
        }
        break;
      case 0xf3:
        if (message.length >= 2) {
          return debugEntry("midi-song-select", `Song Select ${message[1]}`, message);
        }
        break;
      case 0xf6:
        return debugEntry("midi-tune-request", "Tune Request", message);
      case 0xf7:
        return debugEntry("midi-sysex-end", "SysEx End", message);
      case 0xf8:
        return debugEntry("midi-timing-clock", "Timing Clock", message);
      case 0xfa:
        return debugEntry("midi-start", "Start", message);
      case 0xfb:
        return debugEntry("midi-continue", "Continue", message);
      case 0xfc:
        return debugEntry("midi-stop", "Stop", message);
      case 0xfe:
        return debugEntry("midi-active-sensing", "Active Sensing", message);
      case 0xff:
        return debugEntry("midi-system-reset", "System Reset", message);
      default:
        return debugEntry("midi-raw", `Raw ${formatHex(message)}`, message);
    }

    return debugEntry("midi-raw", `Raw ${formatHex(message)}`, message);
  }

  const messageType = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  switch (messageType) {
    case 0x80:
      if (message.length >= 3) {
        // Normalize Note Off to velocity 0 so consumers can key on velocity.
        return noteEntry(channel, message[1], 0, message);
      }
      break;
    case 0x90:
      if (message.length >= 3) {
        const velocity = message[2];
        if (velocity === 0) {
          return noteEntry(channel, message[1], 0, message);
        }
        return noteEntry(channel, message[1], velocity, message);
      }
      break;
    case 0xa0:
      if (message.length >= 3) {
        return debugEntry(
          "midi-poly-pressure",
          `Ch${channel} Note ${message[1]} pressure ${message[2]}`,
          message,
        );
      }
      break;
    case 0xb0:
      if (message.length >= 3) {
        return ccEntry(channel, message[1], message[2], message);
      }
      break;
    case 0xc0:
      if (message.length >= 2) {
        return debugEntry("midi-pc", `Ch${channel} Program ${message[1]}`, message);
      }
      break;
    case 0xd0:
      if (message.length >= 2) {
        return debugEntry("midi-pressure", `Ch${channel} Pressure ${message[1]}`, message);
      }
      break;
    case 0xe0:
      if (message.length >= 3) {
        const value = (message[2] << 7) | message[1];
        return debugEntry("midi-pitch-bend", `Ch${channel} Pitch Bend ${value}`, message);
      }
      break;
    default:
      return debugEntry("midi-raw", `Raw ${formatHex(message)}`, message);
  }

  return debugEntry("midi-raw", `Raw ${formatHex(message)}`, message);
}
