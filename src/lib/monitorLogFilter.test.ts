import { describe, expect, it } from "vitest";
import {
  defaultMonitorDirectionFilter,
  isDirectionFilterActive,
  isMonitorFilterActive,
  matchesDirectionFilter,
} from "./monitorLogFilter";
import { defaultMonitorMidiTypeFilter } from "./monitorMidiFilter";

describe("matchesDirectionFilter", () => {
  const filter = defaultMonitorDirectionFilter();

  it("shows inbound traffic by default", () => {
    expect(matchesDirectionFilter("in", filter)).toBe(true);
  });

  it("hides outbound traffic by default", () => {
    expect(matchesDirectionFilter("out", filter)).toBe(false);
  });
});

describe("isDirectionFilterActive", () => {
  it("is inactive for the default filter", () => {
    expect(isDirectionFilterActive(defaultMonitorDirectionFilter())).toBe(true);
  });

  it("is inactive when both directions are enabled", () => {
    expect(
      isDirectionFilterActive({
        showIn: true,
        showOut: true,
      }),
    ).toBe(false);
  });
});

describe("isMonitorFilterActive", () => {
  it("is inactive when direction and MIDI filters are at defaults", () => {
    expect(
      isMonitorFilterActive(defaultMonitorDirectionFilter(), defaultMonitorMidiTypeFilter()),
    ).toBe(true);
  });
});
