import type { MonitorMidiPortFilterState } from "./monitorMidiPortFilter";
import { isMidiPortFilterActive } from "./monitorMidiPortFilter";
import type { MonitorMidiTypeFilterState } from "./monitorMidiFilter";
import { isMidiTypeFilterActive } from "./monitorMidiFilter";

export interface MonitorDirectionFilterState {
  showIn: boolean;
  showOut: boolean;
}

export function defaultMonitorDirectionFilter(): MonitorDirectionFilterState {
  return {
    showIn: true,
    showOut: false,
  };
}

export function matchesDirectionFilter(
  direction: "in" | "out",
  filter: MonitorDirectionFilterState,
) {
  return direction === "in" ? filter.showIn : filter.showOut;
}

export function isDirectionFilterActive(filter: MonitorDirectionFilterState) {
  return !filter.showIn || !filter.showOut;
}

export function isMonitorFilterActive(
  directionFilter: MonitorDirectionFilterState,
  midiTypeFilter?: MonitorMidiTypeFilterState,
  midiPortFilter?: MonitorMidiPortFilterState,
) {
  return (
    isDirectionFilterActive(directionFilter) ||
    (midiTypeFilter !== undefined && isMidiTypeFilterActive(midiTypeFilter)) ||
    (midiPortFilter !== undefined && isMidiPortFilterActive(midiPortFilter))
  );
}
