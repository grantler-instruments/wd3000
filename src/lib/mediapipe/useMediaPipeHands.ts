import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import type { NormalizedLandmark } from "@mediapipe/hands";
import { HAND_CONNECTIONS, Hands } from "@mediapipe/hands";
import { type RefObject, useEffect, useRef } from "react";
import type { PerformerIoConfig } from "../../types";
import {
  HAND_LANDMARK_LABELS,
  handsModelPath,
  MEDIAPIPE_PREVIEW_HEIGHT,
  MEDIAPIPE_PREVIEW_WIDTH,
} from "./landmarks";
import { sendMediaPipeLandmarkOutputThrottled } from "./output";
import { drawMediaPipePreviewFrame, finishMediaPipePreviewFrame } from "./previewCanvas";
import {
  handsLandmarkKey,
  type MediaPipeLandmark,
  type MediaPipeLandmarkMapping,
  mirrorLandmarkX,
} from "./types";

interface UseMediaPipeHandsOptions {
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

export function useMediaPipeHands({
  active,
  videoDeviceId,
  selectedLandmarks,
  webcamRef,
  canvasRef,
  performerIo,
  mappings,
  highlightColor,
  onLandmarkValues,
}: UseMediaPipeHandsOptions) {
  const performerIoRef = useRef(performerIo);
  const mappingsRef = useRef(mappings);
  const selectedLandmarksRef = useRef(selectedLandmarks);
  const onLandmarkValuesRef = useRef(onLandmarkValues);

  performerIoRef.current = performerIo;
  mappingsRef.current = mappings;
  selectedLandmarksRef.current = selectedLandmarks;
  onLandmarkValuesRef.current = onLandmarkValues;

  // Restart the hands pipeline when the camera device changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: videoDeviceId is a restart trigger
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
    let hands: Hands | null = null;

    const handsSolution = new Hands({
      locateFile: handsModelPath,
    });

    handsSolution.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    handsSolution.onResults((results) => {
      if (cancelled) {
        return;
      }

      const currentSelected = selectedLandmarksRef.current;
      const liveValues: Record<string, MediaPipeLandmark> = {};

      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, handIndex) => {
          HAND_LANDMARK_LABELS.forEach((label, index) => {
            if (!currentSelected.includes(label)) {
              return;
            }

            const landmark = mirrorLandmarkX(landmarks[index]);
            const key = handsLandmarkKey(handIndex, label);
            liveValues[`${handIndex}:${label}`] = landmark;
            sendMediaPipeLandmarkOutputThrottled(
              performerIoRef.current,
              mappingsRef.current,
              key,
              landmark,
            );
          });
        });
      }

      onLandmarkValuesRef.current?.(liveValues);

      drawMediaPipePreviewFrame(canvasCtx, canvas, results.image);

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "rgba(255, 255, 255, 0.1)",
            lineWidth: 1,
          });
        }
      }

      const activeLandmarks: NormalizedLandmark[] = [];
      const inactiveLandmarks: NormalizedLandmark[] = [];

      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          HAND_LANDMARK_LABELS.forEach((label, index) => {
            const landmark = landmarks[index];
            if (currentSelected.includes(label)) {
              activeLandmarks.push(landmark);
            } else {
              inactiveLandmarks.push(landmark);
            }
          });
        });
      }

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

    hands = handsSolution;

    camera = new Camera(webcam.video, {
      onFrame: async () => {
        if (cancelled || !webcam.video) {
          return;
        }

        await handsSolution.send({ image: webcam.video });
      },
      width: MEDIAPIPE_PREVIEW_WIDTH,
      height: MEDIAPIPE_PREVIEW_HEIGHT,
    });

    void camera.start();

    return () => {
      cancelled = true;
      camera?.stop();
      hands?.close();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, canvasRef, highlightColor, videoDeviceId, webcamRef]);
}
