import { useAppStore } from "../store/useAppStore";
import type { Control, LayoutSettings } from "../types";

const MAX_UNDO_STACK = 50;
const COALESCE_MS = 400;

export interface PerformerHistorySnapshot {
  controls: Control[];
  layoutSettings: LayoutSettings;
}

export interface PerformerHistoryEntry {
  snapshot: PerformerHistorySnapshot;
  selectedControlId: string | null;
  inspectorControlId: string | null;
}

let undoStack: PerformerHistoryEntry[] = [];
let redoStack: PerformerHistoryEntry[] = [];
let skipHistoryDepth = 0;
let lastRecordedAt = 0;
let revision = 0;
const revisionListeners = new Set<() => void>();

function notifyRevisionChange(): void {
  revision += 1;
  for (const listener of revisionListeners) {
    listener();
  }
}

export function subscribePerformerHistoryRevision(listener: () => void): () => void {
  revisionListeners.add(listener);
  return () => revisionListeners.delete(listener);
}

export function getPerformerHistoryRevision(): number {
  return revision;
}

function canRecordPerformerHistory(): boolean {
  return useAppStore.getState().mode === "edit";
}

function captureSnapshot(state: {
  controls: Control[];
  layoutSettings: LayoutSettings;
}): PerformerHistorySnapshot {
  return {
    controls: structuredClone(state.controls),
    layoutSettings: structuredClone(state.layoutSettings),
  };
}

function captureEntry(state: {
  controls: Control[];
  layoutSettings: LayoutSettings;
  selectedControlId: string | null;
  inspectorControlId: string | null;
}): PerformerHistoryEntry {
  return {
    snapshot: captureSnapshot(state),
    selectedControlId: state.selectedControlId,
    inspectorControlId: state.inspectorControlId,
  };
}

function performerHistoryStateChanged(
  prev: { controls: Control[]; layoutSettings: LayoutSettings },
  next: { controls: Control[]; layoutSettings: LayoutSettings },
): boolean {
  return prev.controls !== next.controls || prev.layoutSettings !== next.layoutSettings;
}

function pushUndoEntry(entry: PerformerHistoryEntry): void {
  const now = Date.now();
  if (now - lastRecordedAt < COALESCE_MS) {
    return;
  }
  lastRecordedAt = now;
  undoStack.push(entry);
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  notifyRevisionChange();
}

export function isHistoryRecordingEnabled(): boolean {
  return skipHistoryDepth === 0;
}

export function runWithoutHistory(run: () => void): void {
  skipHistoryDepth += 1;
  try {
    run();
  } finally {
    skipHistoryDepth -= 1;
  }
}

export function clearPerformerHistory(): void {
  undoStack = [];
  redoStack = [];
  lastRecordedAt = 0;
  notifyRevisionChange();
}

export function replacePerformerWithoutHistory(run: () => void): void {
  clearPerformerHistory();
  runWithoutHistory(run);
}

function applyEntry(entry: PerformerHistoryEntry): void {
  runWithoutHistory(() => {
    useAppStore.setState({
      controls: structuredClone(entry.snapshot.controls),
      layoutSettings: structuredClone(entry.snapshot.layoutSettings),
      selectedControlId: entry.selectedControlId,
      inspectorControlId: entry.inspectorControlId,
    });
  });
}

export function recordPerformerStateChange(
  prev: {
    controls: Control[];
    layoutSettings: LayoutSettings;
    selectedControlId: string | null;
    inspectorControlId: string | null;
  },
  next: {
    controls: Control[];
    layoutSettings: LayoutSettings;
    selectedControlId: string | null;
    inspectorControlId: string | null;
  },
): void {
  if (!isHistoryRecordingEnabled()) {
    return;
  }
  if (!canRecordPerformerHistory()) {
    return;
  }
  if (!performerHistoryStateChanged(prev, next)) {
    return;
  }

  pushUndoEntry(captureEntry(prev));
  redoStack = [];
  notifyRevisionChange();
}

export function undoPerformerEdit(): boolean {
  if (!canRecordPerformerHistory()) {
    return false;
  }

  const entry = undoStack.pop();
  if (!entry) {
    return false;
  }

  redoStack.push(captureEntry(useAppStore.getState()));
  applyEntry(entry);
  lastRecordedAt = 0;
  notifyRevisionChange();
  return true;
}

export function redoPerformerEdit(): boolean {
  if (!canRecordPerformerHistory()) {
    return false;
  }

  const entry = redoStack.pop();
  if (!entry) {
    return false;
  }

  undoStack.push(captureEntry(useAppStore.getState()));
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  applyEntry(entry);
  lastRecordedAt = 0;
  notifyRevisionChange();
  return true;
}

export function canUndoPerformerEdit(): boolean {
  return canRecordPerformerHistory() && undoStack.length > 0;
}

export function canRedoPerformerEdit(): boolean {
  return canRecordPerformerHistory() && redoStack.length > 0;
}

export function subscribePerformerHistory(): () => void {
  return useAppStore.subscribe((next, prev) => {
    recordPerformerStateChange(prev, next);
  });
}
