import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { MonitorLogEvent, MonitorLogProtocol, SavedMonitorLog } from "../lib/monitorLog";
import { MAX_SAVED_MONITOR_LOGS } from "../lib/monitorLog";

interface MonitorLogLibraryState {
  logs: SavedMonitorLog[];
  pendingSelection: { id: string; protocol: MonitorLogProtocol } | null;
  saveLog: (log: SavedMonitorLog) => void;
  saveLogAndSelect: (log: SavedMonitorLog) => void;
  removeLog: (id: string) => void;
  clearPendingSelection: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeEvent(value: unknown): MonitorLogEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.timestamp !== "number" ||
    typeof value.deltaMs !== "number" ||
    (value.direction !== "in" && value.direction !== "out") ||
    typeof value.kind !== "string" ||
    typeof value.summary !== "string"
  ) {
    return null;
  }

  return {
    timestamp: value.timestamp,
    deltaMs: value.deltaMs,
    direction: value.direction,
    kind: value.kind as MonitorLogEvent["kind"],
    summary: value.summary,
    ...(value.payload !== undefined
      ? { payload: value.payload as MonitorLogEvent["payload"] }
      : {}),
  };
}

function sanitizeSavedLog(value: unknown): SavedMonitorLog | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.protocol !== "midi" && value.protocol !== "osc") ||
    !Array.isArray(value.events)
  ) {
    return null;
  }

  const events = value.events
    .map(sanitizeEvent)
    .filter((event): event is MonitorLogEvent => event !== null);

  if (events.length === 0) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    protocol: value.protocol,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    events,
  };
}

function sanitizeLogs(value: unknown): SavedMonitorLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(sanitizeSavedLog)
    .filter((log): log is SavedMonitorLog => log !== null)
    .slice(0, MAX_SAVED_MONITOR_LOGS);
}

export const useMonitorLogStore = create<MonitorLogLibraryState>()(
  persist(
    (set) => ({
      logs: [],
      pendingSelection: null,
      saveLog: (log) =>
        set((state) => ({
          logs: [log, ...state.logs.filter((entry) => entry.id !== log.id)].slice(
            0,
            MAX_SAVED_MONITOR_LOGS,
          ),
        })),
      saveLogAndSelect: (log) =>
        set((state) => ({
          logs: [log, ...state.logs.filter((entry) => entry.id !== log.id)].slice(
            0,
            MAX_SAVED_MONITOR_LOGS,
          ),
          pendingSelection: { id: log.id, protocol: log.protocol },
        })),
      removeLog: (id) =>
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        })),
      clearPendingSelection: () => set({ pendingSelection: null }),
    }),
    {
      name: "wd3000-log-library",
      version: 1,
      partialize: (state) => ({
        logs: state.logs,
      }),
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {};
        return {
          ...currentState,
          logs: sanitizeLogs(persisted.logs),
        };
      },
    },
  ),
);

export function useSavedMonitorLogs(protocol: MonitorLogProtocol) {
  return useMonitorLogStore(
    useShallow((state) => state.logs.filter((log) => log.protocol === protocol)),
  );
}
