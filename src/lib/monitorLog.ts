import type {
  DebugLogDirection,
  DebugLogEntry,
  DebugLogKind,
  MonitorEventPayload,
} from "./debugLog";
import { isOscDebugEntry } from "./debugLog";
import { isMidiDebugKind } from "./midiTypes";
import { resolveMonitorEventPayload } from "./monitorLogParse";

export const MONITOR_LOG_EXPORT_VERSION = 1;
export const MONITOR_LOG_APP_ID = "wd3000";
export const MONITOR_LOG_KIND = "monitor-log";
export const MAX_SAVED_MONITOR_LOGS = 50;

export type MonitorLogProtocol = "midi" | "osc";

export interface MonitorLogEvent {
  timestamp: number;
  deltaMs: number;
  direction: DebugLogDirection;
  kind: DebugLogKind;
  summary: string;
  payload?: MonitorEventPayload;
}

export interface SavedMonitorLog {
  id: string;
  name: string;
  protocol: MonitorLogProtocol;
  savedAt: string;
  events: MonitorLogEvent[];
}

export interface MonitorLogFileExport {
  version: number;
  app: typeof MONITOR_LOG_APP_ID;
  kind: typeof MONITOR_LOG_KIND;
  name: string;
  protocol: MonitorLogProtocol;
  savedAt: string;
  events: MonitorLogEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMonitorLogProtocol(value: unknown): value is MonitorLogProtocol {
  return value === "midi" || value === "osc";
}

function isDebugLogDirection(value: unknown): value is DebugLogDirection {
  return value === "in" || value === "out";
}

function parseMonitorLogEvent(value: unknown, index: number): MonitorLogEvent {
  if (!isRecord(value)) {
    throw new Error(`Event ${index + 1} is invalid.`);
  }

  if (
    typeof value.timestamp !== "number" ||
    typeof value.deltaMs !== "number" ||
    !isDebugLogDirection(value.direction) ||
    typeof value.kind !== "string" ||
    typeof value.summary !== "string"
  ) {
    throw new Error(`Event ${index + 1} is invalid.`);
  }

  return {
    timestamp: value.timestamp,
    deltaMs: value.deltaMs,
    direction: value.direction,
    kind: value.kind as DebugLogKind,
    summary: value.summary,
    ...(value.payload !== undefined ? { payload: value.payload as MonitorEventPayload } : {}),
  };
}

export function filterDebugEntriesByProtocol(
  entries: DebugLogEntry[],
  protocol: MonitorLogProtocol,
): DebugLogEntry[] {
  return entries.filter((entry) =>
    protocol === "osc" ? isOscDebugEntry(entry) : isMidiDebugKind(entry.kind),
  );
}

export function createMonitorLogEvents(entries: DebugLogEntry[]): MonitorLogEvent[] {
  const chronological = [...entries].sort((left, right) => left.timestamp - right.timestamp);
  const firstTimestamp = chronological[0]?.timestamp ?? 0;

  return chronological.map((entry) => ({
    timestamp: entry.timestamp,
    deltaMs: entry.timestamp - firstTimestamp,
    direction: entry.direction,
    kind: entry.kind,
    summary: entry.summary,
    payload: resolveMonitorEventPayload(entry) ?? undefined,
  }));
}

export function createSavedMonitorLog(
  name: string,
  protocol: MonitorLogProtocol,
  entries: DebugLogEntry[],
): SavedMonitorLog {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Name is required.");
  }

  const filtered = filterDebugEntriesByProtocol(entries, protocol);
  if (filtered.length === 0) {
    throw new Error("No monitor messages to save.");
  }

  return {
    id: crypto.randomUUID(),
    name: trimmedName,
    protocol,
    savedAt: new Date().toISOString(),
    events: createMonitorLogEvents(filtered),
  };
}

export function createMonitorLogFileExport(log: SavedMonitorLog): MonitorLogFileExport {
  return {
    version: MONITOR_LOG_EXPORT_VERSION,
    app: MONITOR_LOG_APP_ID,
    kind: MONITOR_LOG_KIND,
    name: log.name,
    protocol: log.protocol,
    savedAt: log.savedAt,
    events: log.events,
  };
}

export function serializeMonitorLogExport(log: SavedMonitorLog): string {
  return `${JSON.stringify(createMonitorLogFileExport(log), null, 2)}\n`;
}

export function sanitizeMonitorLogFileName(name: string) {
  const sanitized = name
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "monitor-log";
}

export function exportMonitorLogToFile(log: SavedMonitorLog) {
  const blob = new Blob([serializeMonitorLogExport(log)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${sanitizeMonitorLogFileName(log.name)}.wd3000.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseMonitorLogImport(raw: string): SavedMonitorLog {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Monitor log must be a JSON object.");
  }

  if (parsed.app !== undefined && parsed.app !== MONITOR_LOG_APP_ID) {
    throw new Error("This file is not a WD3000 monitor log.");
  }

  if (parsed.kind !== undefined && parsed.kind !== MONITOR_LOG_KIND) {
    throw new Error("This file is not a WD3000 monitor log.");
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  if (!name) {
    throw new Error("Monitor log name is missing.");
  }

  if (!isMonitorLogProtocol(parsed.protocol)) {
    throw new Error("Monitor log protocol is invalid.");
  }

  if (!Array.isArray(parsed.events) || parsed.events.length === 0) {
    throw new Error("Monitor log has no events.");
  }

  return {
    id: crypto.randomUUID(),
    name,
    protocol: parsed.protocol,
    savedAt:
      typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    events: parsed.events.map(parseMonitorLogEvent),
  };
}

export function formatMonitorLogDuration(events: MonitorLogEvent[]) {
  if (events.length === 0) {
    return "0s";
  }

  const lastDelta = events[events.length - 1]?.deltaMs ?? 0;
  if (lastDelta < 1000) {
    return `${lastDelta}ms`;
  }

  return `${(lastDelta / 1000).toFixed(1)}s`;
}
