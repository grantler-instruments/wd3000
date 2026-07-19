import { describe, expect, it } from "vitest";
import { buildOscLandmarkArgs } from "./output";

describe("buildOscLandmarkArgs", () => {
  it("includes x, y, and z as floats", () => {
    expect(buildOscLandmarkArgs({ x: 0.1, y: 0.2, z: -0.3 })).toEqual([
      { type: "float", value: 0.1 },
      { type: "float", value: 0.2 },
      { type: "float", value: -0.3 },
    ]);
  });

  it("appends visibility when present", () => {
    expect(buildOscLandmarkArgs({ x: 0.1, y: 0.2, z: -0.3, visibility: 0.95 })).toEqual([
      { type: "float", value: 0.1 },
      { type: "float", value: 0.2 },
      { type: "float", value: -0.3 },
      { type: "float", value: 0.95 },
    ]);
  });
});
