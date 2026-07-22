import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { MidiDebugKind } from "../lib/midiTypes";
import { isMidiDebugKind } from "../lib/midiTypes";
import type { MonitorLogProtocol } from "../lib/monitorLog";
import {
  defaultMonitorDirectionFilter,
  type MonitorDirectionFilterState,
} from "../lib/monitorLogFilter";
import {
  defaultMonitorMidiTypeFilter,
  MONITOR_MIDI_KINDS,
  type MonitorMidiTypeFilterState,
} from "../lib/monitorMidiFilter";
import {
  defaultMonitorMidiPortFilter,
  type MonitorMidiPortFilterState,
} from "../lib/monitorMidiPortFilter";

interface StoredProtocolFilters {
  direction: MonitorDirectionFilterState;
  /** null = all kinds enabled */
  midiKinds: MidiDebugKind[] | null;
  /** null = all ports */
  midiPorts: string[] | null;
}

interface MonitorFilterStoreState {
  byProtocol: Record<MonitorLogProtocol, StoredProtocolFilters>;
  setDirection: (protocol: MonitorLogProtocol, direction: MonitorDirectionFilterState) => void;
  setMidiTypes: (protocol: MonitorLogProtocol, filter: MonitorMidiTypeFilterState) => void;
  setMidiPorts: (protocol: MonitorLogProtocol, filter: MonitorMidiPortFilterState) => void;
}

function defaultStoredFilters(): StoredProtocolFilters {
  return {
    direction: defaultMonitorDirectionFilter(),
    midiKinds: null,
    midiPorts: null,
  };
}

function defaultByProtocol(): Record<MonitorLogProtocol, StoredProtocolFilters> {
  return {
    midi: defaultStoredFilters(),
    osc: defaultStoredFilters(),
    mqtt: defaultStoredFilters(),
    artnet: defaultStoredFilters(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeDirection(value: unknown): MonitorDirectionFilterState {
  if (!isRecord(value)) {
    return defaultMonitorDirectionFilter();
  }

  return {
    showIn: typeof value.showIn === "boolean" ? value.showIn : true,
    showOut: typeof value.showOut === "boolean" ? value.showOut : false,
  };
}

function sanitizeMidiKinds(value: unknown): MidiDebugKind[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const kinds = value.filter((entry): entry is MidiDebugKind => isMidiDebugKind(entry));
  if (kinds.length === 0 || kinds.length >= MONITOR_MIDI_KINDS.length) {
    return null;
  }

  return kinds;
}

function sanitizeMidiPorts(value: unknown): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const ports = value.filter((entry): entry is string => typeof entry === "string");
  return ports.length > 0 ? ports : null;
}

function sanitizeProtocolFilters(value: unknown): StoredProtocolFilters {
  if (!isRecord(value)) {
    return defaultStoredFilters();
  }

  return {
    direction: sanitizeDirection(value.direction),
    midiKinds: sanitizeMidiKinds(value.midiKinds),
    midiPorts: sanitizeMidiPorts(value.midiPorts),
  };
}

function sanitizeByProtocol(value: unknown): Record<MonitorLogProtocol, StoredProtocolFilters> {
  const defaults = defaultByProtocol();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    midi: sanitizeProtocolFilters(value.midi),
    osc: sanitizeProtocolFilters(value.osc),
    mqtt: sanitizeProtocolFilters(value.mqtt),
    artnet: sanitizeProtocolFilters(value.artnet),
  };
}

function toMidiTypeFilter(stored: MidiDebugKind[] | null): MonitorMidiTypeFilterState {
  if (stored === null) {
    return defaultMonitorMidiTypeFilter();
  }

  return new Set(stored);
}

function fromMidiTypeFilter(filter: MonitorMidiTypeFilterState): MidiDebugKind[] | null {
  if (filter.size >= MONITOR_MIDI_KINDS.length) {
    return null;
  }

  return [...filter];
}

function toMidiPortFilter(stored: string[] | null): MonitorMidiPortFilterState {
  if (stored === null) {
    return defaultMonitorMidiPortFilter();
  }

  return new Set(stored);
}

function fromMidiPortFilter(filter: MonitorMidiPortFilterState): string[] | null {
  if (filter === null) {
    return null;
  }

  return [...filter];
}

export const useMonitorFilterStore = create<MonitorFilterStoreState>()(
  persist(
    (set) => ({
      byProtocol: defaultByProtocol(),
      setDirection: (protocol, direction) =>
        set((state) => ({
          byProtocol: {
            ...state.byProtocol,
            [protocol]: {
              ...state.byProtocol[protocol],
              direction,
            },
          },
        })),
      setMidiTypes: (protocol, filter) =>
        set((state) => ({
          byProtocol: {
            ...state.byProtocol,
            [protocol]: {
              ...state.byProtocol[protocol],
              midiKinds: fromMidiTypeFilter(filter),
            },
          },
        })),
      setMidiPorts: (protocol, filter) =>
        set((state) => ({
          byProtocol: {
            ...state.byProtocol,
            [protocol]: {
              ...state.byProtocol[protocol],
              midiPorts: fromMidiPortFilter(filter),
            },
          },
        })),
    }),
    {
      name: "wd3000-monitor-filters",
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {};
        return {
          ...currentState,
          byProtocol: sanitizeByProtocol(persisted.byProtocol),
        };
      },
    },
  ),
);

export function useMonitorFilters(protocol: MonitorLogProtocol) {
  const stored = useMonitorFilterStore(useShallow((state) => state.byProtocol[protocol]));
  const setDirection = useMonitorFilterStore((state) => state.setDirection);
  const setMidiTypes = useMonitorFilterStore((state) => state.setMidiTypes);
  const setMidiPorts = useMonitorFilterStore((state) => state.setMidiPorts);

  const midiTypeFilter = useMemo(() => toMidiTypeFilter(stored.midiKinds), [stored.midiKinds]);
  const midiPortFilter = useMemo(() => toMidiPortFilter(stored.midiPorts), [stored.midiPorts]);

  return {
    directionFilter: stored.direction,
    setDirectionFilter: (direction: MonitorDirectionFilterState) =>
      setDirection(protocol, direction),
    midiTypeFilter,
    setMidiTypeFilter: (filter: MonitorMidiTypeFilterState) => setMidiTypes(protocol, filter),
    midiPortFilter,
    setMidiPortFilter: (filter: MonitorMidiPortFilterState) => setMidiPorts(protocol, filter),
  };
}
