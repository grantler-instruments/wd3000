import { beforeEach, describe, expect, it, vi } from "vitest";
import { Control, defaultMqttMapping } from "../types";
import { collectControlSubtree, cloneControlSubtree } from "./controlClipboard";

function control(
  id: string,
  overrides: Partial<Control> & Pick<Control, "type">,
): Control {
  return {
    id,
    label: id,
    protocol: "osc",
    osc: { address: `/${id}` },
    mqtt: defaultMqttMapping(overrides.type, 1),
    midi: { channel: 1, note: 60, cc: 0 },
    layout: { x: 0, y: 0, width: 120, height: 80, order: 0 },
    ...overrides,
  };
}

describe("collectControlSubtree", () => {
  const controls: Control[] = [
    control("tabs", { type: "tabs", tabs: [{ id: "tab-a", label: "A" }] }),
    control("child", { type: "button", parentId: "tabs", tabId: "tab-a" }),
    control("other", { type: "button" }),
  ];

  it("includes the root and nested children", () => {
    const subtree = collectControlSubtree(controls, "tabs");
    expect(subtree.map((entry) => entry.id).sort()).toEqual(["child", "tabs"]);
  });

  it("returns only the root when there are no children", () => {
    const subtree = collectControlSubtree(controls, "other");
    expect(subtree.map((entry) => entry.id)).toEqual(["other"]);
  });
});

describe("cloneControlSubtree", () => {
  beforeEach(() => {
    let counter = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `uuid-${++counter}`,
    });
  });

  it("clones ids and remaps parent relationships", () => {
    const controls: Control[] = [
      control("tabs", { type: "tabs", tabs: [{ id: "tab-a", label: "A" }] }),
      control("child", { type: "button", parentId: "tabs", tabId: "tab-a" }),
    ];

    const cloned = cloneControlSubtree(controls, "tabs", {
      positionOffset: { x: 16, y: 8 },
    });

    expect(cloned.rootId).toBe("uuid-1");
    expect(cloned.controls).toHaveLength(2);

    const root = cloned.controls.find((entry) => entry.id === cloned.rootId);
    const child = cloned.controls.find((entry) => entry.parentId === cloned.rootId);

    expect(root?.layout).toMatchObject({ x: 16, y: 8 });
    expect(child?.tabId).toBe("uuid-2");
    expect(child?.parentId).toBe(cloned.rootId);
  });

  it("can detach the clone to the top level", () => {
    const controls: Control[] = [
      control("tabs", { type: "tabs", tabs: [{ id: "tab-a", label: "A" }] }),
      control("child", { type: "button", parentId: "tabs", tabId: "tab-a" }),
    ];

    const cloned = cloneControlSubtree(controls, "child", { toTopLevel: true });

    const root = cloned.controls.find((entry) => entry.id === cloned.rootId);
    expect(root?.parentId).toBeUndefined();
    expect(root?.tabId).toBeUndefined();
  });
});
