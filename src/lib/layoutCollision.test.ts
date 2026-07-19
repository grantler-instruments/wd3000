import { describe, expect, it } from "vitest";
import { type Control, defaultMqttMapping, LAYOUT_GRID_SIZE } from "../types";
import {
  layoutPeers,
  rectsOverlap,
  resolveControlLayout,
  resolveNonOverlappingPosition,
  resolveNonOverlappingSize,
} from "./layoutCollision";

function control(id: string, overrides: Partial<Control> & Pick<Control, "type">): Control {
  return {
    id,
    label: id,
    osc: { enabled: true, address: `/${id}` },
    mqtt: defaultMqttMapping(overrides.type, 1),
    midi: { enabled: false, channel: 1, note: 60, cc: 0 },
    layout: { x: 0, y: 0, width: 240, height: 168, order: 0 },
    ...overrides,
  };
}

describe("rectsOverlap", () => {
  it("treats edge-touching rects as non-overlapping", () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 0, width: 100, height: 100 },
      ),
    ).toBe(false);
  });

  it("detects overlapping rects", () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 50, y: 50, width: 100, height: 100 },
      ),
    ).toBe(true);
  });
});

describe("resolveNonOverlappingPosition", () => {
  it("keeps a free position", () => {
    const position = resolveNonOverlappingPosition(
      { x: 16, y: 16, width: 240, height: 168 },
      [{ x: 300, y: 16, width: 240, height: 168 }],
      LAYOUT_GRID_SIZE,
    );
    expect(position).toEqual({ x: 16, y: 16 });
  });

  it("finds a nearby free slot when overlapping", () => {
    const position = resolveNonOverlappingPosition(
      { x: 16, y: 16, width: 240, height: 168 },
      [{ x: 16, y: 16, width: 240, height: 168 }],
      LAYOUT_GRID_SIZE,
    );
    expect(position).not.toEqual({ x: 16, y: 16 });
    expect(
      rectsOverlap(
        { ...position, width: 240, height: 168 },
        { x: 16, y: 16, width: 240, height: 168 },
      ),
    ).toBe(false);
  });
});

describe("resolveNonOverlappingSize", () => {
  it("clamps width so a right-side neighbor is not overlapped", () => {
    const size = resolveNonOverlappingSize(
      { x: 0, y: 0, width: 320, height: 168 },
      [{ x: 240, y: 0, width: 240, height: 168 }],
      180,
      120,
      LAYOUT_GRID_SIZE,
    );
    expect(size.width).toBe(240);
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: size.width, height: size.height },
        { x: 240, y: 0, width: 240, height: 168 },
      ),
    ).toBe(false);
  });
});

describe("layoutPeers", () => {
  it("returns top-level peers for canvas controls", () => {
    const a = control("a", { type: "button" });
    const controls = [
      a,
      control("b", { type: "button", layout: { x: 300, y: 0, width: 240, height: 168, order: 1 } }),
      control("child", { type: "button", parentId: "tabs", tabId: "tab-a" }),
    ];
    expect(layoutPeers(controls, a).map((entry) => entry.id)).toEqual(["b"]);
  });

  it("returns tab siblings for nested controls", () => {
    const childA = control("child-a", {
      type: "button",
      parentId: "tabs",
      tabId: "tab-a",
      layout: { x: 0, y: 0, width: 240, height: 168, order: 0 },
    });
    const controls = [
      control("tabs", { type: "tabs", tabs: [{ id: "tab-a", label: "A" }] }),
      childA,
      control("child-b", {
        type: "button",
        parentId: "tabs",
        tabId: "tab-a",
        layout: { x: 300, y: 0, width: 240, height: 168, order: 1 },
      }),
      control("other", { type: "button" }),
    ];
    expect(layoutPeers(controls, childA).map((entry) => entry.id)).toEqual(["child-b"]);
  });
});

describe("resolveControlLayout", () => {
  it("moves a control off an occupied slot", () => {
    const overlapping = control("b", {
      type: "button",
      layout: { x: 16, y: 16, width: 240, height: 168, order: 1 },
    });
    const controls = [
      control("a", { type: "button", layout: { x: 16, y: 16, width: 240, height: 168, order: 0 } }),
      overlapping,
    ];
    const resolved = resolveControlLayout(controls, overlapping, overlapping.layout);
    expect(
      rectsOverlap(
        { x: resolved.x, y: resolved.y, width: resolved.width, height: resolved.height },
        { x: 16, y: 16, width: 240, height: 168 },
      ),
    ).toBe(false);
  });
});
