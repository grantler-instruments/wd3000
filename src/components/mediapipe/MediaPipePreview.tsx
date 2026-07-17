import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  MEDIAPIPE_PREVIEW_HEIGHT,
  MEDIAPIPE_PREVIEW_WIDTH,
} from "../../lib/mediapipe/landmarks";
import { resetMediaPipeOutputThrottles } from "../../lib/mediapipe/output";
import type { MediaPipeLandmark } from "../../lib/mediapipe/types";
import { useMediaPipeHands } from "../../lib/mediapipe/useMediaPipeHands";
import { useMediaPipePose } from "../../lib/mediapipe/useMediaPipePose";
import { useAppStore } from "../../store/useAppStore";

function isVideoReady(video: HTMLVideoElement | null | undefined) {
  return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
}

export function MediaPipePreview({
  onLiveValues,
}: {
  onLiveValues?: (values: Record<string, MediaPipeLandmark>) => void;
}) {
  const theme = useTheme();
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const mediapipeConfig = useAppStore((state) => state.mediapipeConfig);
  const performerIo = useAppStore((state) => state.performerIo);
  const mediapipeMappings = useAppStore((state) => state.mediapipeMappings);
  const trackingActive = mediapipeConfig.active;

  useEffect(() => {
    setCameraReady(false);
  }, [mediapipeConfig.videoDeviceId, mediapipeConfig.tracker]);

  useEffect(() => {
    if (!trackingActive) {
      setCameraReady(false);
      return;
    }

    const syncCameraReady = () => {
      const video = webcamRef.current?.video ?? null;
      setCameraReady(isVideoReady(video));
    };

    syncCameraReady();

    const video = webcamRef.current?.video;
    video?.addEventListener("loadeddata", syncCameraReady);

    const intervalId = window.setInterval(syncCameraReady, 250);

    return () => {
      video?.removeEventListener("loadeddata", syncCameraReady);
      window.clearInterval(intervalId);
    };
  }, [trackingActive, mediapipeConfig.videoDeviceId]);

  const handleLandmarkValues = useCallback(
    (values: Record<string, MediaPipeLandmark>) => {
      onLiveValues?.(values);
    },
    [onLiveValues],
  );

  useMediaPipePose({
    active: trackingActive && mediapipeConfig.tracker === "pose" && cameraReady,
    videoDeviceId: mediapipeConfig.videoDeviceId,
    selectedLandmarks: mediapipeConfig.selectedLandmarks,
    webcamRef,
    canvasRef,
    performerIo,
    mappings: mediapipeMappings,
    highlightColor: theme.palette.secondary.main,
    onLandmarkValues: handleLandmarkValues,
  });

  useMediaPipeHands({
    active: trackingActive && mediapipeConfig.tracker === "hands" && cameraReady,
    videoDeviceId: mediapipeConfig.videoDeviceId,
    selectedLandmarks: mediapipeConfig.selectedLandmarks,
    webcamRef,
    canvasRef,
    performerIo,
    mappings: mediapipeMappings,
    highlightColor: theme.palette.secondary.main,
    onLandmarkValues: handleLandmarkValues,
  });

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: `${MEDIAPIPE_PREVIEW_WIDTH} / ${MEDIAPIPE_PREVIEW_HEIGHT}`,
          bgcolor: "background.default",
          borderRadius: 1,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
        }}
      >
        {trackingActive ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored
            width={MEDIAPIPE_PREVIEW_WIDTH}
            height={MEDIAPIPE_PREVIEW_HEIGHT}
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={() => setCameraReady(false)}
            videoConstraints={
              mediapipeConfig.videoDeviceId
                ? { deviceId: mediapipeConfig.videoDeviceId }
                : { facingMode: "user" }
            }
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <Box
          component="canvas"
          ref={canvasRef}
          width={MEDIAPIPE_PREVIEW_WIDTH}
          height={MEDIAPIPE_PREVIEW_HEIGHT}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {!trackingActive ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.55)",
              color: "text.secondary",
              typography: "body2",
              px: 2,
              textAlign: "center",
            }}
          >
            Enable tracking to start the camera and stream selected landmarks.
          </Box>
        ) : !cameraReady ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.55)",
              color: "text.secondary",
              typography: "body2",
              px: 2,
              textAlign: "center",
            }}
          >
            Starting camera…
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function stopMediaPipeTracking() {
  resetMediaPipeOutputThrottles();
}
