import { describe, expect, it } from "vitest";
import { defaultPerformerIoConfig } from "../../types";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
} from "./types";
import { scaleSensorValueToMidi } from "./output";

describe("sensor MIDI mapping defaults", () => {
  const performerIo = defaultPerformerIoConfig();

  it("uses a 0-180 degree input range for lid angle", () => {
    const mapping = defaultSensorAxisMapping("lid_angle", "angle", performerIo);

    expect(mapping.midi.min).toBe(0);
    expect(mapping.midi.max).toBe(180);
  });

  it("upgrades legacy lid-angle mappings that used the generic 0-127 range", () => {
    const mapping = normalizeSensorAxisMapping(
      {
        midi: {
          enabled: true,
          outputId: null,
          channel: 1,
          cc: 1,
          min: 0,
          max: 127,
        },
      },
      performerIo,
      "lid_angle",
      "angle",
    );

    expect(mapping.midi.min).toBe(0);
    expect(mapping.midi.max).toBe(180);
  });
});

describe("scaleSensorValueToMidi", () => {
  it("maps lid angle degrees across the full MIDI range", () => {
    expect(scaleSensorValueToMidi(0, 0, 180)).toBe(0);
    expect(scaleSensorValueToMidi(90, 0, 180)).toBe(64);
    expect(scaleSensorValueToMidi(180, 0, 180)).toBe(127);
  });

  it("does not pass through absolute angle values when input max is wrong", () => {
    expect(scaleSensorValueToMidi(90, 0, 127)).toBe(90);
    expect(scaleSensorValueToMidi(90, 0, 180)).toBe(64);
  });
});
