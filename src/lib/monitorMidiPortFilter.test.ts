import { describe, expect, it } from "vitest";
import {
  collectMonitorMidiPorts,
  defaultMonitorMidiPortFilter,
  isMidiPortFilterActive,
  matchesMidiPortFilter,
  toggleMonitorMidiPort,
} from "./monitorMidiPortFilter";

describe("matchesMidiPortFilter", () => {
  it("shows all ports when the filter is unset", () => {
    expect(matchesMidiPortFilter("IAC Driver Bus 1", defaultMonitorMidiPortFilter())).toBe(true);
  });

  it("shows only selected ports when the filter is active", () => {
    const filter = new Set(["Launchpad X"]);

    expect(matchesMidiPortFilter("Launchpad X", filter)).toBe(true);
    expect(matchesMidiPortFilter("IAC Driver Bus 1", filter)).toBe(false);
  });
});

describe("toggleMonitorMidiPort", () => {
  const ports = ["A", "B"];

  it("returns null when every port is enabled", () => {
    expect(toggleMonitorMidiPort(null, ports, "A", false)).toEqual(new Set(["B"]));
    expect(toggleMonitorMidiPort(new Set(["B"]), ports, "A", true)).toBeNull();
  });
});

describe("collectMonitorMidiPorts", () => {
  it("collects unique ports from entries and system lists", () => {
    expect(
      collectMonitorMidiPorts(
        [{ portName: "Out 1" }, { portName: "Out 1" }, { portName: "In 1" }],
        ["In 1"],
        ["Out 2"],
      ),
    ).toEqual(["In 1", "Out 1", "Out 2"]);
  });
});

describe("isMidiPortFilterActive", () => {
  it("is inactive by default", () => {
    expect(isMidiPortFilterActive(defaultMonitorMidiPortFilter())).toBe(false);
  });
});
