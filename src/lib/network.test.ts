import { describe, expect, it } from "vitest";
import { clampPort } from "./network";

describe("clampPort", () => {
  it("accepts ports in 1..65535", () => {
    expect(clampPort(1, 1883)).toBe(1);
    expect(clampPort(1883, 1)).toBe(1883);
    expect(clampPort(65535, 1883)).toBe(65535);
  });

  it("rounds fractional ports", () => {
    expect(clampPort(1883.4, 1)).toBe(1883);
    expect(clampPort(1883.6, 1)).toBe(1884);
  });

  it("returns fallback for invalid values", () => {
    expect(clampPort(0, 1883)).toBe(1883);
    expect(clampPort(65536, 1883)).toBe(1883);
    expect(clampPort(Number.NaN, 1883)).toBe(1883);
    expect(clampPort(Number.POSITIVE_INFINITY, 1883)).toBe(1883);
  });
});
