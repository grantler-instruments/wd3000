import { useSyncExternalStore } from "react";
import { useMonitorLogStore } from "../store/useMonitorLogStore";
import type { DebugLogEntry, DebugLogKind } from "./debugLog";
import { asMidiPayload } from "./midiPayload";
import {
  createMonitorLogEvents,
  type MonitorLogEvent,
  type MonitorLogProtocol,
  type SavedMonitorLog,
} from "./monitorLog";
import { resolveMonitorEventPayload } from "./monitorLogParse";
import { sendMidiRaw, sendOscMessage } from "./output";

const MAX_REPLAY_OUTPUT_ENTRIES = 200;
const REPLAY_LOG_NAME = "Replay";

let replayAbort: AbortController | null = null;
let currentReplayDone: Promise<void> = Promise.resolve();

interface ReplaySession {
  protocol: MonitorLogProtocol | null;
  logId: string | null;
  outputEntries: DebugLogEntry[];
}

const idleReplaySession: ReplaySession = {
  protocol: null,
  logId: null,
  outputEntries: [],
};

let replaySession: ReplaySession = idleReplaySession;

export type MonitorReplayDirection = "in" | "out";

export interface MonitorReplayProgress {
  active: boolean;
  logId: string | null;
  direction: MonitorReplayDirection | null;
  completed: number;
  total: number;
}

const idleReplayProgress: MonitorReplayProgress = {
  active: false,
  logId: null,
  direction: null,
  completed: 0,
  total: 0,
};

let replayProgress: MonitorReplayProgress = idleReplayProgress;
const progressListeners = new Set<() => void>();

function notifyProgress() {
  for (const listener of progressListeners) {
    listener();
  }
}

function setReplayProgress(next: MonitorReplayProgress) {
  replayProgress = next;
  notifyProgress();
}

function subscribeReplayProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

function getReplayProgressSnapshot() {
  return replayProgress;
}

export function useMonitorLogReplayProgress() {
  return useSyncExternalStore(
    subscribeReplayProgress,
    getReplayProgressSnapshot,
    getReplayProgressSnapshot,
  );
}

export function replayProgressFillFraction(
  entryCount: number,
  rowFills: number[],
  progress: MonitorReplayProgress,
  logId?: string,
): number {
  if (
    !progress.active ||
    !logId ||
    progress.logId !== logId ||
    progress.total === 0 ||
    entryCount === 0
  ) {
    return 0;
  }

  if (progress.completed >= progress.total) {
    return 1;
  }

  if (progress.completed === 0) {
    return 0;
  }

  const fill = rowFills[progress.completed - 1];
  if (fill !== undefined) {
    return fill;
  }

  return progress.completed / progress.total;
}

export interface MonitorLogProgressLayout {
  fills: number[];
  fromBottom: boolean;
}

export function directionRowProgressLayout(
  entries: Array<{ id: string; direction: "in" | "out"; timestamp: number }>,
  direction: MonitorReplayDirection,
): MonitorLogProgressLayout {
  if (entries.length === 0) {
    return { fills: [], fromBottom: true };
  }

  const fromBottom =
    entries.length < 2 || entries[0].timestamp > entries[entries.length - 1].timestamp;

  const chronological = entries
    .filter((entry) => entry.direction === direction)
    .sort((left, right) => left.timestamp - right.timestamp);

  const fills = chronological.map((replayEntry) => {
    const index = entries.findIndex((entry) => entry.id === replayEntry.id);
    if (index === -1) {
      return 0;
    }

    if (fromBottom) {
      return (entries.length - index) / entries.length;
    }

    return (index + 1) / entries.length;
  });

  return { fills, fromBottom };
}

export type ReplayRowStatus = "sent" | "next" | "pending";

export function getReplayRowStatuses(
  entries: Array<{ id: string; direction: "in" | "out"; timestamp: number }>,
  progress: MonitorReplayProgress,
  logId?: string,
): Map<string, ReplayRowStatus> {
  const statuses = new Map<string, ReplayRowStatus>();

  if (
    !progress.active ||
    !logId ||
    progress.logId !== logId ||
    !progress.direction ||
    progress.total === 0
  ) {
    return statuses;
  }

  const chronological = entries
    .filter((entry) => entry.direction === progress.direction)
    .sort((left, right) => left.timestamp - right.timestamp);

  for (let index = 0; index < chronological.length; index++) {
    const entry = chronological[index];
    if (index < progress.completed) {
      statuses.set(entry.id, "sent");
    } else if (index === progress.completed) {
      statuses.set(entry.id, "next");
    } else {
      statuses.set(entry.id, "pending");
    }
  }

  return statuses;
}

export interface MonitorReplayTarget {
  protocol: MonitorLogProtocol;
  midiPortName: string | null;
  oscHost: string;
  oscPort: number;
}

export function isMonitorLogReplayActive() {
  return replayAbort !== null;
}

export function stopMonitorLogReplay() {
  replayAbort?.abort();
}

function pushReplayOutput(entry: Omit<DebugLogEntry, "id" | "timestamp">) {
  replaySession = {
    ...replaySession,
    outputEntries: [
      {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      },
      ...replaySession.outputEntries,
    ].slice(0, MAX_REPLAY_OUTPUT_ENTRIES),
  };
}

function startReplaySession(log: SavedMonitorLog) {
  replaySession = {
    protocol: log.protocol,
    logId: log.id,
    outputEntries: [],
  };
}

function resetReplaySession() {
  replaySession = idleReplaySession;
}

function persistReplayOutput() {
  const { protocol, outputEntries } = replaySession;
  if (!protocol || outputEntries.length === 0) {
    return;
  }

  const log: SavedMonitorLog = {
    id: crypto.randomUUID(),
    name: REPLAY_LOG_NAME,
    protocol,
    savedAt: new Date().toISOString(),
    events: createMonitorLogEvents(outputEntries),
  };

  useMonitorLogStore.getState().saveLogAndSelect(log);
}

export function directionReplayEvents(
  events: MonitorLogEvent[],
  direction: MonitorReplayDirection,
): MonitorLogEvent[] {
  const matching = events.filter((event) => event.direction === direction);
  if (matching.length === 0) {
    return [];
  }

  const firstTimestamp = matching[0].timestamp;
  return matching.map((event) => ({
    ...event,
    deltaMs: event.timestamp - firstTimestamp,
  }));
}

export function countMonitorEventsByDirection(
  events: MonitorLogEvent[],
  direction: MonitorReplayDirection,
) {
  return events.filter((event) => event.direction === direction).length;
}

export function countIncomingMonitorEvents(events: MonitorLogEvent[]) {
  return countMonitorEventsByDirection(events, "in");
}

export function countOutgoingMonitorEvents(events: MonitorLogEvent[]) {
  return countMonitorEventsByDirection(events, "out");
}

function sleep(ms: number, signal: AbortSignal) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Replay stopped.", "AbortError"));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
    };

    signal.addEventListener("abort", onAbort);
  });
}

async function replayOscEventAsOutput(event: MonitorLogEvent, target: MonitorReplayTarget) {
  const payload =
    event.payload && "address" in event.payload
      ? event.payload
      : resolveMonitorEventPayload({
          id: "",
          timestamp: event.timestamp,
          direction: event.direction,
          kind: event.kind,
          summary: event.summary,
          payload: event.payload,
        });

  if (!payload || !("address" in payload)) {
    throw new Error(`Cannot replay OSC message: ${event.summary}`);
  }

  await sendOscMessage(
    target.oscHost,
    target.oscPort,
    payload.address,
    payload.args,
    event.summary,
    { logToDebug: false },
  );
  pushReplayOutput({
    direction: "out",
    kind: "osc",
    summary: event.summary,
    payload: {
      address: payload.address,
      args: payload.args,
    },
  });
}

async function replayMidiEventAsOutput(event: MonitorLogEvent, target: MonitorReplayTarget) {
  if (!target.midiPortName) {
    throw new Error("Select a MIDI output port.");
  }

  const payload =
    event.payload && "bytes" in event.payload
      ? event.payload
      : resolveMonitorEventPayload({
          id: "",
          timestamp: event.timestamp,
          direction: event.direction,
          kind: event.kind,
          summary: event.summary,
          payload: event.payload,
        });

  if (!payload || !("bytes" in payload)) {
    throw new Error(`Cannot replay MIDI message: ${event.summary}`);
  }

  await sendMidiRaw(target.midiPortName, payload.bytes, event.kind as DebugLogKind, event.summary, {
    logToDebug: false,
  });
  pushReplayOutput({
    direction: "out",
    kind: event.kind as DebugLogKind,
    summary: event.summary,
    payload: asMidiPayload(payload.bytes),
  });
}

export async function replayMonitorLog(
  log: SavedMonitorLog,
  target: MonitorReplayTarget,
  direction: MonitorReplayDirection = "in",
) {
  const events = directionReplayEvents(log.events, direction);
  if (events.length === 0) {
    throw new Error(
      direction === "in" ? "No incoming messages to send." : "No outgoing messages to send.",
    );
  }

  if (target.protocol === "midi" && !target.midiPortName) {
    throw new Error("Select a MIDI output port.");
  }

  if (target.protocol === "osc" && (!target.oscHost.trim() || target.oscPort <= 0)) {
    throw new Error("Enter a valid OSC host and port.");
  }

  await currentReplayDone;

  stopMonitorLogReplay();

  const controller = new AbortController();
  replayAbort = controller;
  startReplaySession(log);

  let resolveDone!: () => void;
  currentReplayDone = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  setReplayProgress({
    active: true,
    logId: log.id,
    direction,
    completed: 0,
    total: events.length,
  });

  try {
    let previousDelta = 0;

    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      await sleep(event.deltaMs - previousDelta, controller.signal);
      previousDelta = event.deltaMs;

      if (target.protocol === "osc") {
        await replayOscEventAsOutput(event, target);
      } else {
        await replayMidiEventAsOutput(event, target);
      }

      setReplayProgress({
        active: true,
        logId: log.id,
        direction,
        completed: index + 1,
        total: events.length,
      });
    }
  } finally {
    if (replayAbort === controller) {
      replayAbort = null;
    }
    setReplayProgress(idleReplayProgress);
    persistReplayOutput();
    resetReplaySession();
    resolveDone();
  }
}
