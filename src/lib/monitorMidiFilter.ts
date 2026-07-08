import type { MidiDebugKind } from "./midiTypes";
import { isMidiDebugKind } from "./midiTypes";

export const MONITOR_MIDI_KINDS: MidiDebugKind[] = [
  "midi-note",
  "midi-cc",
  "midi-pc",
  "midi-pitch-bend",
  "midi-pressure",
  "midi-poly-pressure",
  "midi-mtc",
  "midi-song-position",
  "midi-song-select",
  "midi-tune-request",
  "midi-sysex",
  "midi-sysex-end",
  "midi-timing-clock",
  "midi-start",
  "midi-continue",
  "midi-stop",
  "midi-active-sensing",
  "midi-system-reset",
  "midi-raw",
];

export type MonitorMidiTypeFilterState = Set<MidiDebugKind>;

export function defaultMonitorMidiTypeFilter(): MonitorMidiTypeFilterState {
  return new Set(MONITOR_MIDI_KINDS);
}

export function isMidiTypeFilterActive(filter: MonitorMidiTypeFilterState) {
  return filter.size < MONITOR_MIDI_KINDS.length;
}

export function matchesMidiTypeFilter(
  kind: string,
  filter: MonitorMidiTypeFilterState,
) {
  if (!isMidiDebugKind(kind)) {
    return true;
  }

  return filter.has(kind);
}

export function toggleMonitorMidiType(
  filter: MonitorMidiTypeFilterState,
  kind: MidiDebugKind,
  enabled: boolean,
): MonitorMidiTypeFilterState {
  const next = new Set(filter);

  if (enabled) {
    next.add(kind);
    return next;
  }

  if (next.size <= 1) {
    return filter;
  }

  next.delete(kind);
  return next;
}
