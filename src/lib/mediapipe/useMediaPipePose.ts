import { Camera } from "@mediapipe/camera_utils";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS, Pose } from "@mediapipe/pose";
import { useEffect, useRef, type RefObject } from "react";
import {
  MEDIAPIPE_PREVIEW_HEIGHT,
  MEDIAPIPE_PREVIEW_WIDTH,
  POSE_LANDMARK_LABELS,
  poseModelPath,
} from "./landmarks";
import { sendMediaPipeLandmarkOutputThrottled } from "./output";
import {
  drawMediaPipePreviewFrame,
  finishMediaPipePreviewFrame,
} from "./previewCanvas";
import type { NormalizedLandmark } from "@mediapipe/pose";
import type { PerformerIoConfig } from "../../types";
import { mirrorLandmarkX, poseLandmarkKey, type MediaPipeLandmark, type MediaPipeLandmarkMapping } from "./types";

interface UseMediaPipePoseOptions {
  active: boolean;
  videoDeviceId: string | null;
  selectedLandmarks: string[];
  webcamRef: RefObject<{ video: HTMLVideoElement | null } | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  performerIo: PerformerIoConfig;
  mappings: Record<string, MediaPipeLandmarkMapping>;
  highlightColor: string;
  onLandmarkValues?: (values: Record<string, MediaPipeLandmark>) => void;
}

export function useMediaPipePose({
  active,
  videoDeviceId,
  selectedLandmarks,
  webcamRef,
  canvasRef,
  performerIo,
  mappings,
  highlightColor,
  onLandmarkValues,
}: UseMediaPipePoseOptions) {
  const performerIoRef = useRef(performerIo);
  const mappingsRef = useRef(mappings);
  const selectedLandmarksRef = useRef(selectedLandmarks);
  const onLandmarkValuesRef = useRef(onLandmarkValues);

  performerIoRef.current = performerIo;
  mappingsRef.current = mappings;
  selectedLandmarksRef.current = selectedLandmarks;
  onLandmarkValuesRef.current = onLandmarkValues;

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = canvasRef.current;
    const webcam = webcamRef.current;
    if (!canvas || !webcam?.video) {
      return;
    }

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) {
      return;
    }

    let cancelled = false;
    let camera: Camera | null = null;
    let pose: Pose | null = null;

    const poseSolution = new Pose({
      locateFile: poseModelPath,
    });

    poseSolution.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseSolution.onResults((results) => {
      if (cancelled) {
        return;
      }

      const currentSelected = selectedLandmarksRef.current;
      const liveValues: Record<string, MediaPipeLandmark> = {};

      if (!results.poseLandmarks) {
        drawMediaPipePreviewFrame(canvasCtx, canvas, results.image);
        finishMediaPipePreviewFrame(canvasCtx);
        onLandmarkValuesRef.current?.(liveValues);
        return;
      }

      POSE_LANDMARK_LABELS.forEach((label, index) => {
        if (!currentSelected.includes(label)) {
          return;
        }

        const landmark = mirrorLandmarkX(results.poseLandmarks![index]);
        const key = poseLandmarkKey(label);
        liveValues[label] = landmark;
        sendMediaPipeLandmarkOutputThrottled(
          performerIoRef.current,
          mappingsRef.current,
          key,
          landmark,
        );
      });

      onLandmarkValuesRef.current?.(liveValues);

      drawMediaPipePreviewFrame(canvasCtx, canvas, results.image);

      const activeLandmarks: NormalizedLandmark[] = [];
      const inactiveLandmarks: NormalizedLandmark[] = [];

      POSE_LANDMARK_LABELS.forEach((label, index) => {
        const landmark = results.poseLandmarks![index];
        if (currentSelected.includes(label)) {
          activeLandmarks.push(landmark);
        } else {
          inactiveLandmarks.push(landmark);
        }
      });

      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "rgba(255, 255, 255, 0.1)",
        lineWidth: 1,
      });
      drawLandmarks(canvasCtx, activeLandmarks, {
        color: highlightColor,
        radius: 5,
      });
      drawLandmarks(canvasCtx, inactiveLandmarks, {
        color: "rgba(255, 255, 255, 0.1)",
        radius: 2,
      });

      finishMediaPipePreviewFrame(canvasCtx);
    });

    pose = poseSolution;

    camera = new Camera(webcam.video, {
      onFrame: async () => {
        if (cancelled || !webcam.video) {
          return;
        }

        await poseSolution.send({ image: webcam.video });
      },
      width: MEDIAPIPE_PREVIEW_WIDTH,
      height: MEDIAPIPE_PREVIEW_HEIGHT,
    });

    void camera.start();

    return () => {
      cancelled = true;
      camera?.stop();
      pose?.close();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, canvasRef, highlightColor, videoDeviceId, webcamRef]);
}
