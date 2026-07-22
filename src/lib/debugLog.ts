import { useSyncExternalStore } from "react";
import type { OscArgPayload } from "./oscMessages";

export type DebugLogDirection = "in" | "out";

export type DebugLogKind =
  | "osc"
  | "artnet"
  | "mqtt"
  | "midi-note"
  | "midi-cc"
  | "midi-pc"
  | "midi-pitch-bend"
  | "midi-pressure"
  | "midi-poly-pressure"
  | "midi-mtc"
  | "midi-song-position"
  | "midi-song-select"
  | "midi-tune-request"
  | "midi-sysex"
  | "midi-sysex-end"
  | "midi-timing-clock"
  | "midi-start"
  | "midi-continue"
  | "midi-stop"
  | "midi-active-sensing"
  | "midi-system-reset"
  | "midi-raw";

export interface OscMonitorPayload {
  address: string;
  args: OscArgPayload[];
}

export interface MidiMonitorPayload {
  bytes: number[];
}

export interface ArtNetMonitorPayload {
  universe: number;
  sequence: number;
  physical: number;
  channelCount: number;
  channels: number[];
  /** Present on composer outbound; inbound Art-Net omits this (treat as artnet). */
  transport?: "artnet" | "enttec" | "deemex";
}

export interface MqttMonitorPayload {
  topic: string;
  payload: number[];
  qos: number;
  retain: boolean;
}

export type MonitorEventPayload =
  | OscMonitorPayload
  | MidiMonitorPayload
  | ArtNetMonitorPayload
  | MqttMonitorPayload;

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  direction: DebugLogDirection;
  kind: DebugLogKind;
  summary: string;
  payload?: MonitorEventPayload;
  portName?: string | null;
}

const MAX_ENTRIES = 200;
const OUTBOUND_ECHO_MS = 1000;

let entries: DebugLogEntry[] = [];
const listeners = new Set<() => void>();
const entryListeners = new Set<(entry: DebugLogEntry) => boolean | undefined>();
let recentOutboundOsc: { key: string; at: number } | null = null;
let recentOutboundArtNet: { key: string; at: number } | null = null;
let recentOutboundMqtt: { key: string; at: number } | null = null;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function notifyEntryListeners(entry: DebugLogEntry): boolean {
  for (const listener of entryListeners) {
    if (listener(entry) === true) {
      return true;
    }
  }
  return false;
}

/**
 * Observe each new debug log entry before it is stored.
 * Return true to consume the entry exclusively (skip the live monitor).
 */
export function onDebugLogEntry(listener: (entry: DebugLogEntry) => boolean | undefined) {
  entryListeners.add(listener);
  return () => entryListeners.delete(listener);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return entries;
}

export function normalizeOscDebugSummary(summary: string) {
  const tagged = summary.match(/^(.+?) \[([^\]]+)\](?: (.+))?$/);
  if (tagged) {
    const address = tagged[1].trim();
    const tags = tagged[2];
    const values = (tagged[3] ?? "").trim();
    return values ? `${address} [${tags}] ${values}` : `${address} [${tags}]`;
  }

  const legacy = summary.match(/^(.+?) → (.+)$/);
  if (!legacy) {
    return summary.trim();
  }

  const address = legacy[1].trim();
  let args = legacy[2].trim();
  if (args.startsWith("[") && args.endsWith("]")) {
    args = args.slice(1, -1);
  }

  return `${address} → ${args}`;
}

export function recordOutboundOscDebug(summary: string) {
  recentOutboundOsc = {
    key: normalizeOscDebugSummary(summary),
    at: Date.now(),
  };
}

export function isEchoOfRecentOutboundOsc(summary: string) {
  if (!recentOutboundOsc) {
    return false;
  }

  if (Date.now() - recentOutboundOsc.at > OUTBOUND_ECHO_MS) {
    return false;
  }

  return normalizeOscDebugSummary(summary) === recentOutboundOsc.key;
}

export function recordOutboundArtNetDebug(summary: string) {
  recentOutboundArtNet = {
    key: summary.trim(),
    at: Date.now(),
  };
}

export function isEchoOfRecentOutboundArtNet(summary: string) {
  if (!recentOutboundArtNet) {
    return false;
  }

  if (Date.now() - recentOutboundArtNet.at > OUTBOUND_ECHO_MS) {
    return false;
  }

  return summary.trim() === recentOutboundArtNet.key;
}

export function recordOutboundMqttDebug(summary: string) {
  recentOutboundMqtt = {
    key: summary.trim(),
    at: Date.now(),
  };
}

export function isEchoOfRecentOutboundMqtt(summary: string) {
  if (!recentOutboundMqtt) {
    return false;
  }

  if (Date.now() - recentOutboundMqtt.at > OUTBOUND_ECHO_MS) {
    return false;
  }

  return summary.trim() === recentOutboundMqtt.key;
}

export function pushDebugLog(entry: Omit<DebugLogEntry, "id" | "timestamp">) {
  const newEntry: DebugLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  if (notifyEntryListeners(newEntry)) {
    return;
  }
  entries = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  notify();
}

export function clearDebugLog() {
  entries = [];
  notify();
}

export function clearDebugLogFiltered(predicate: (entry: DebugLogEntry) => boolean) {
  entries = entries.filter((entry) => !predicate(entry));
  notify();
}

export function isArtNetDebugEntry(entry: DebugLogEntry) {
  return entry.kind === "artnet";
}

export function isMqttDebugEntry(entry: DebugLogEntry) {
  return entry.kind === "mqtt";
}

export function isOscDebugEntry(entry: DebugLogEntry) {
  return entry.kind === "osc";
}

export function getDebugLogSnapshot() {
  return entries;
}

export function useDebugLog() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
