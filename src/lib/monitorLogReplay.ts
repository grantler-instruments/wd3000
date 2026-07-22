import { useSyncExternalStore } from "react";
import { sendArtNetDmx } from "./artnet";
import { type DebugLogEntry, type DebugLogKind, onDebugLogEntry } from "./debugLog";
import { asMidiPayload } from "./midiPayload";
import { isMidiDebugKind } from "./midiTypes";
import type { MonitorLogEvent, MonitorLogProtocol, SavedMonitorLog } from "./monitorLog";
import { resolveMonitorEventPayload } from "./monitorLogParse";
import { decodeMqttPayload, type MqttQoS, type MqttTransportProtocol } from "./mqtt";
import { sendMidiRaw, sendMqttMessage, sendOscMessage } from "./output";

const MAX_REPLAY_OUTPUT_ENTRIES = 200;
/** Keep capturing inbound replies briefly after the last outbound send. */
const REPLAY_CAPTURE_TAIL_MS = 500;

let replayAbort: AbortController | null = null;
let currentReplayDone: Promise<void> = Promise.resolve();

export interface ReplaySession {
  protocol: MonitorLogProtocol | null;
  logId: string | null;
  entries: DebugLogEntry[];
}

const idleReplaySession: ReplaySession = {
  protocol: null,
  logId: null,
  entries: [],
};

let replaySession: ReplaySession = idleReplaySession;
const sessionListeners = new Set<() => void>();

function notifyReplaySession() {
  for (const listener of sessionListeners) {
    listener();
  }
}

function subscribeReplaySession(listener: () => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function getReplaySessionSnapshot() {
  return replaySession;
}

export function useReplaySession() {
  return useSyncExternalStore(
    subscribeReplaySession,
    getReplaySessionSnapshot,
    getReplaySessionSnapshot,
  );
}

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
  mqttHost: string;
  mqttPort: number;
  mqttProtocol: MqttTransportProtocol;
  artnetHost: string;
  artnetPort: number;
}

export function isMonitorLogReplayActive() {
  return replayAbort !== null;
}

export function stopMonitorLogReplay() {
  replayAbort?.abort();
}

export function clearReplaySession() {
  stopMonitorLogReplay();
  void currentReplayDone.then(() => {
    replaySession = idleReplaySession;
    notifyReplaySession();
  });
}

export function removeReplaySessionEntry(id: string) {
  const next = replaySession.entries.filter((entry) => entry.id !== id);
  if (next.length === replaySession.entries.length) {
    return;
  }

  replaySession = {
    ...replaySession,
    entries: next,
  };
  notifyReplaySession();
}

function addReplayEntry(entry: DebugLogEntry) {
  replaySession = {
    ...replaySession,
    entries: [entry, ...replaySession.entries].slice(0, MAX_REPLAY_OUTPUT_ENTRIES),
  };
  notifyReplaySession();
}

function pushReplayOutput(entry: Omit<DebugLogEntry, "id" | "timestamp">) {
  addReplayEntry({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}

export function captureReplayIncoming(entry: DebugLogEntry): boolean {
  if (
    !replayAbort ||
    entry.direction !== "in" ||
    !replaySession.protocol ||
    !matchesReplayProtocol(entry, replaySession.protocol)
  ) {
    return false;
  }

  addReplayEntry(entry);
  return true;
}

onDebugLogEntry(captureReplayIncoming);

function matchesReplayProtocol(entry: DebugLogEntry, protocol: MonitorLogProtocol) {
  if (protocol === "midi") {
    return isMidiDebugKind(entry.kind);
  }
  if (protocol === "osc") {
    return entry.kind === "osc";
  }
  if (protocol === "mqtt") {
    return entry.kind === "mqtt";
  }
  return entry.kind === "artnet";
}

function startReplaySession(log: SavedMonitorLog) {
  replaySession = {
    protocol: log.protocol,
    logId: log.id,
    entries: [],
  };
  notifyReplaySession();
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
  if (signal.aborted) {
    return Promise.reject(new DOMException("Replay stopped.", "AbortError"));
  }

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

async function replayMqttEventAsOutput(event: MonitorLogEvent, target: MonitorReplayTarget) {
  const payload =
    event.payload && "topic" in event.payload
      ? event.payload
      : resolveMonitorEventPayload({
          id: "",
          timestamp: event.timestamp,
          direction: event.direction,
          kind: event.kind,
          summary: event.summary,
          payload: event.payload,
        });

  if (!payload || !("topic" in payload)) {
    throw new Error(`Cannot replay MQTT message: ${event.summary}`);
  }

  const text = decodeMqttPayload(payload.payload);
  const qos = (payload.qos === 1 || payload.qos === 2 ? payload.qos : 0) as MqttQoS;

  await sendMqttMessage(
    target.mqttHost,
    target.mqttPort,
    target.mqttProtocol,
    payload.topic,
    text,
    qos,
    payload.retain,
    event.summary,
    { logToDebug: false },
  );
  pushReplayOutput({
    direction: "out",
    kind: "mqtt",
    summary: event.summary,
    payload: {
      topic: payload.topic,
      payload: payload.payload,
      qos,
      retain: payload.retain,
    },
  });
}

async function replayArtNetEventAsOutput(event: MonitorLogEvent, target: MonitorReplayTarget) {
  const payload =
    event.payload && "universe" in event.payload
      ? event.payload
      : resolveMonitorEventPayload({
          id: "",
          timestamp: event.timestamp,
          direction: event.direction,
          kind: event.kind,
          summary: event.summary,
          payload: event.payload,
        });

  if (!payload || !("universe" in payload)) {
    throw new Error(`Cannot replay Art-Net message: ${event.summary}`);
  }

  await sendArtNetDmx(
    target.artnetHost,
    target.artnetPort,
    payload.universe,
    payload.sequence,
    payload.channels,
    event.summary,
    { logToDebug: false },
  );
  pushReplayOutput({
    direction: "out",
    kind: "artnet",
    summary: event.summary,
    payload: {
      universe: payload.universe,
      sequence: payload.sequence,
      physical: payload.physical,
      channelCount: payload.channelCount,
      channels: payload.channels,
      transport: "artnet",
    },
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

  if (target.protocol === "mqtt" && (!target.mqttHost.trim() || target.mqttPort <= 0)) {
    throw new Error("Enter a valid MQTT host and port.");
  }

  if (target.protocol === "artnet" && (!target.artnetHost.trim() || target.artnetPort <= 0)) {
    throw new Error("Enter a valid Art-Net host and port.");
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
      if (controller.signal.aborted) {
        throw new DOMException("Replay stopped.", "AbortError");
      }

      const event = events[index];
      await sleep(event.deltaMs - previousDelta, controller.signal);
      previousDelta = event.deltaMs;

      if (controller.signal.aborted) {
        throw new DOMException("Replay stopped.", "AbortError");
      }

      if (target.protocol === "osc") {
        await replayOscEventAsOutput(event, target);
      } else if (target.protocol === "mqtt") {
        await replayMqttEventAsOutput(event, target);
      } else if (target.protocol === "artnet") {
        await replayArtNetEventAsOutput(event, target);
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

    // Allow late device responses to land in the replay session before we stop.
    await sleep(REPLAY_CAPTURE_TAIL_MS, controller.signal);
  } finally {
    if (replayAbort === controller) {
      replayAbort = null;
    }
    setReplayProgress(idleReplayProgress);
    resolveDone();
  }
}
