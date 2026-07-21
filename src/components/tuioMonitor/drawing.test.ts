import { describe, expect, it } from "vitest";
import type { TuioEntity } from "../../lib/tuio";
import { entityLabel, entityPosition, formatTime } from "./drawing";

describe("tuioMonitor drawing helpers", () => {
  it("formats timestamps with milliseconds", () => {
    const stamp = new Date("2026-01-02T03:04:05.067Z").getTime();
    expect(formatTime(stamp)).toMatch(/\.\d{3}$/);
  });

  it("builds entity labels with optional class/group/data", () => {
    const entity: TuioEntity = {
      kind: "object",
      sessionId: 7,
      classId: 12,
      group: "g1",
      data: "payload",
      x: 0.1,
      y: 0.2,
    };
    expect(entityLabel(entity)).toContain("#7");
    expect(entityLabel(entity)).toContain("class 12");
    expect(entityLabel(entity)).toContain("g1");
    expect(entityLabel(entity)).toContain("payload");
  });

  it("formats positions or an em dash when missing", () => {
    expect(entityPosition({ kind: "cursor", sessionId: 1, x: 0.5, y: 0.25 })).toBe("0.500, 0.250");
    expect(entityPosition({ kind: "symbol", sessionId: 2 })).toBe("—");
  });
});
