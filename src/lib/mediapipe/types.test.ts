import { describe, expect, it } from "vitest";
import { defaultPerformerIoConfig } from "../../types";
import {
  defaultMediaPipeLandmarkMapping,
  formatMediaPipeLandmarkKey,
  handsLandmarkKey,
  mediaPipeLandmarkKeysForSelection,
  mirrorLandmarkX,
  normalizeMediaPipeLandmarkMapping,
  poseLandmarkKey,
} from "./types";

describe("mediapipe mapping keys", () => {
  it("builds pose landmark keys", () => {
    expect(poseLandmarkKey("left_wrist")).toBe("pose:left_wrist");
  });

  it("builds hands landmark keys", () => {
    expect(handsLandmarkKey(0, "thumb_tip")).toBe("hands:0:thumb_tip");
    expect(handsLandmarkKey(1, "thumb_tip")).toBe("hands:1:thumb_tip");
  });

  it("returns both hand keys for a selected hand landmark", () => {
    expect(mediaPipeLandmarkKeysForSelection("hands", "thumb_tip")).toEqual([
      "hands:0:thumb_tip",
      "hands:1:thumb_tip",
    ]);
  });

  it("formats keys for display", () => {
    expect(formatMediaPipeLandmarkKey("pose:left_wrist")).toBe("left_wrist");
    expect(formatMediaPipeLandmarkKey("hands:1:thumb_tip")).toBe("hand 1 / thumb_tip");
  });

  it("mirrors landmark x for selfie preview coordinates", () => {
    expect(mirrorLandmarkX({ x: 0.25, y: 0.5, z: -0.1 })).toEqual({
      x: 0.75,
      y: 0.5,
      z: -0.1,
    });
  });
});

describe("mediapipe mapping defaults", () => {
  const performerIo = defaultPerformerIoConfig();

  it("uses popeye-compatible default OSC and MQTT addresses for pose", () => {
    const mapping = defaultMediaPipeLandmarkMapping("pose:left_wrist", performerIo);

    expect(mapping.osc.enabled).toBe(true);
    expect(mapping.osc.address).toBe("/mediapipe/pose/left_wrist");
    expect(mapping.mqtt.topic).toBe("mediapipe/pose/left_wrist");
    expect(mapping.midi.enabled).toBe(false);
  });

  it("uses per-hand default addresses for hands", () => {
    const mapping = defaultMediaPipeLandmarkMapping("hands:0:thumb_tip", performerIo);

    expect(mapping.osc.address).toBe("/mediapipe/hands/0/thumb_tip");
    expect(mapping.mqtt.topic).toBe("mediapipe/hands/0/thumb_tip");
  });

  it("normalizes partial mappings", () => {
    const mapping = normalizeMediaPipeLandmarkMapping(
      {
        osc: { enabled: false },
        mqtt: { enabled: true, topic: "custom/topic" },
      },
      performerIo,
      "pose:nose",
    );

    expect(mapping.osc.enabled).toBe(false);
    expect(mapping.osc.address).toBe("/mediapipe/pose/nose");
    expect(mapping.mqtt.enabled).toBe(true);
    expect(mapping.mqtt.topic).toBe("custom/topic");
  });
});
