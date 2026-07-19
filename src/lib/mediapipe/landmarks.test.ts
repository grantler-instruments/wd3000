import { describe, expect, it } from "vitest";
import { handsModelPath, mediapipeSketchPath, poseModelPath } from "./landmarks";

describe("mediapipe asset paths", () => {
  it("includes the Vite base URL for model and sketch assets", () => {
    expect(poseModelPath("pose_web.binarypb")).toBe(
      "/wd3000/app/models/pose/pose_web.binarypb",
    );
    expect(handsModelPath("hands.binarypb")).toBe(
      "/wd3000/app/models/hands/hands.binarypb",
    );
    expect(mediapipeSketchPath("body.svg")).toBe("/wd3000/app/mediapipe/body.svg");
  });
});
