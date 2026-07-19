import type {
  DebugLogEntry,
  MidiMonitorPayload,
  MonitorEventPayload,
  OscMonitorPayload,
} from "./debugLog";
import { isMidiDebugKind } from "./midiTypes";
import type { OscArgPayload } from "./oscMessages";

function parseHexBytes(summary: string): number[] | null {
  const match = summary.match(/(?:SysEx|Raw)\s+([0-9A-Fa-f\s]+)$/);
  if (!match) {
    return null;
  }

  const hex = match[1].replace(/\s+/g, "");
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(hex)) {
    return null;
  }

  const bytes: number[] = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }

  return bytes;
}

function parseOscPayload(entry: DebugLogEntry): OscMonitorPayload | null {
  if (entry.payload && "address" in entry.payload) {
    return entry.payload;
  }

  const tagged = entry.summary.match(/^(.+?) \[([^\]]+)\](?: (.+))?$/);
  if (!tagged) {
    const addressOnly = entry.summary.trim();
    if (addressOnly.startsWith("/")) {
      return { address: addressOnly, args: [] };
    }
    return null;
  }

  const address = tagged[1].trim();
  const tags = tagged[2];
  const valuesPart = (tagged[3] ?? "").trim();
  const args: OscArgPayload[] = [];

  if (!valuesPart) {
    for (const tag of tags) {
      if (tag === "T") {
        args.push({ type: "true" });
      } else if (tag === "F") {
        args.push({ type: "false" });
      }
    }
    return { address, args };
  }

  const values = splitOscValues(valuesPart);
  const tagChars = [...tags];

  for (let index = 0; index < tagChars.length; index += 1) {
    const tag = tagChars[index];
    const rawValue = values[index];

    switch (tag) {
      case "i":
        if (rawValue !== undefined) {
          args.push({ type: "int", value: Number.parseInt(rawValue, 10) || 0 });
        }
        break;
      case "f":
      case "d":
        if (rawValue !== undefined) {
          args.push({ type: "float", value: Number.parseFloat(rawValue) || 0 });
        }
        break;
      case "s":
        if (rawValue !== undefined) {
          args.push({
            type: "string",
            value: rawValue.startsWith('"') ? JSON.parse(rawValue) : rawValue,
          });
        }
        break;
      case "T":
        args.push({ type: "true" });
        break;
      case "F":
        args.push({ type: "false" });
        break;
      default:
        break;
    }
  }

  return { address, args };
}

function splitOscValues(valuesPart: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < valuesPart.length; index += 1) {
    const char = valuesPart[index];

    if (char === '"') {
      current += char;
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function parseMidiPayload(entry: DebugLogEntry): MidiMonitorPayload | null {
  if (entry.payload && "bytes" in entry.payload) {
    return entry.payload;
  }

  const hexBytes = parseHexBytes(entry.summary);
  if (hexBytes) {
    return { bytes: hexBytes };
  }

  const noteMatch = entry.summary.match(/^Ch(\d+) Note (On|Off) (\d+) vel (\d+)$/);
  if (noteMatch) {
    const channel = Number.parseInt(noteMatch[1], 10);
    const note = Number.parseInt(noteMatch[3], 10);
    const velocity = Number.parseInt(noteMatch[4], 10);
    const status = noteMatch[2] === "On" ? 0x90 : 0x80;
    return {
      bytes: [status | ((channel - 1) & 0x0f), note & 0x7f, velocity & 0x7f],
    };
  }

  const outboundNoteMatch = entry.summary.match(/^Ch(\d+) Note (\d+) vel (\d+)$/);
  if (outboundNoteMatch) {
    const channel = Number.parseInt(outboundNoteMatch[1], 10);
    const note = Number.parseInt(outboundNoteMatch[2], 10);
    const velocity = Number.parseInt(outboundNoteMatch[3], 10);
    return {
      bytes: [0x90 | ((channel - 1) & 0x0f), note & 0x7f, velocity & 0x7f],
    };
  }

  const ccMatch = entry.summary.match(/^Ch(\d+) CC(\d+) → (\d+)$/);
  if (ccMatch) {
    const channel = Number.parseInt(ccMatch[1], 10);
    const cc = Number.parseInt(ccMatch[2], 10);
    const value = Number.parseInt(ccMatch[3], 10);
    return {
      bytes: [0xb0 | ((channel - 1) & 0x0f), cc & 0x7f, value & 0x7f],
    };
  }

  const pcMatch = entry.summary.match(/^Ch(\d+) Program (\d+)$/);
  if (pcMatch) {
    const channel = Number.parseInt(pcMatch[1], 10);
    const program = Number.parseInt(pcMatch[2], 10);
    return {
      bytes: [0xc0 | ((channel - 1) & 0x0f), program & 0x7f],
    };
  }

  const pitchMatch = entry.summary.match(/^Ch(\d+) Pitch Bend (-?\d+)$/);
  if (pitchMatch) {
    const channel = Number.parseInt(pitchMatch[1], 10);
    const signed = Number.parseInt(pitchMatch[2], 10);
    const value = signed + 8192;
    return {
      bytes: [0xe0 | ((channel - 1) & 0x0f), value & 0x7f, (value >> 7) & 0x7f],
    };
  }

  const pressureMatch = entry.summary.match(/^Ch(\d+) Pressure (\d+)$/);
  if (pressureMatch) {
    const channel = Number.parseInt(pressureMatch[1], 10);
    const pressure = Number.parseInt(pressureMatch[2], 10);
    return {
      bytes: [0xd0 | ((channel - 1) & 0x0f), pressure & 0x7f],
    };
  }

  const polyMatch = entry.summary.match(/^Ch(\d+) Note (\d+) pressure (\d+)$/);
  if (polyMatch) {
    const channel = Number.parseInt(polyMatch[1], 10);
    const note = Number.parseInt(polyMatch[2], 10);
    const pressure = Number.parseInt(polyMatch[3], 10);
    return {
      bytes: [0xa0 | ((channel - 1) & 0x0f), note & 0x7f, pressure & 0x7f],
    };
  }

  const systemMessages: Record<string, number[]> = {
    "Tune Request": [0xf6],
    "SysEx End": [0xf7],
    "Timing Clock": [0xf8],
    Start: [0xfa],
    Continue: [0xfb],
    Stop: [0xfc],
    "Active Sensing": [0xfe],
    "System Reset": [0xff],
  };

  const systemBytes = systemMessages[entry.summary];
  if (systemBytes) {
    return { bytes: systemBytes };
  }

  return null;
}

export function resolveMonitorEventPayload(entry: DebugLogEntry): MonitorEventPayload | null {
  if (entry.kind === "osc") {
    return parseOscPayload(entry);
  }

  if (isMidiDebugKind(entry.kind)) {
    return parseMidiPayload(entry);
  }

  return null;
}
