import { describe, expect, it } from "vitest";
import { parseSynthOscMessage } from "./synthOsc";

describe("parseSynthOscMessage", () => {
  it("parses noteOn with velocity and channel", () => {
    expect(
      parseSynthOscMessage(
        "/synth/noteOn",
        [
          { type: "int", value: 60 },
          { type: "int", value: 100 },
          { type: "int", value: 2 },
        ],
        "/synth",
      ),
    ).toEqual({ type: "noteOn", note: 60, velocity: 100, channel: 2 });
  });

  it("parses noteOff", () => {
    expect(
      parseSynthOscMessage("/synth/noteOff", [{ type: "float", value: 60 }], "/synth"),
    ).toEqual({ type: "noteOff", note: 60, channel: 1 });
  });

  it("parses gain and ADSR params", () => {
    expect(parseSynthOscMessage("/synth/gain", [{ type: "float", value: 0.5 }], "/synth")).toEqual({
      type: "gain",
      value: 0.5,
    });
    expect(
      parseSynthOscMessage("/synth/attack", [{ type: "float", value: 0.2 }], "/synth"),
    ).toEqual({ type: "param", key: "attack", value: 0.2 });
  });

  it("ignores unrelated addresses", () => {
    expect(
      parseSynthOscMessage("/other/noteOn", [{ type: "int", value: 60 }], "/synth"),
    ).toBeNull();
  });
});
