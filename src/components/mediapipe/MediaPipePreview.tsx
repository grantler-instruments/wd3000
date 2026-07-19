import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Webcam from "react-webcam";
import { MEDIAPIPE_PREVIEW_HEIGHT, MEDIAPIPE_PREVIEW_WIDTH } from "../../lib/mediapipe/landmarks";
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
  fill = false,
}: {
  onLiveValues?: (values: Record<string, MediaPipeLandmark>) => void;
  fill?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const mediapipeConfig = useAppStore((state) => state.mediapipeConfig);
  const performerIo = useAppStore((state) => state.performerIo);
  const mediapipeMappings = useAppStore((state) => state.mediapipeMappings);
  const trackingActive = mediapipeConfig.selectedLandmarks.length > 0;

  useEffect(() => {
    setCameraReady(false);
  }, [mediapipeConfig.videoDeviceId, mediapipeConfig.tracker]);

  useEffect(() => {
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
  }, [mediapipeConfig.videoDeviceId]);

  useEffect(() => {
    if (!trackingActive) {
      resetMediaPipeOutputThrottles();
    }
  }, [trackingActive, mediapipeConfig.tracker, mediapipeConfig.videoDeviceId]);

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
    <Box sx={fill ? { width: "100%", height: "100%", minHeight: 0 } : undefined}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: fill ? "100%" : undefined,
          aspectRatio: fill
            ? undefined
            : `${MEDIAPIPE_PREVIEW_WIDTH} / ${MEDIAPIPE_PREVIEW_HEIGHT}`,
          bgcolor: "background.default",
          borderRadius: fill ? 0 : 1,
          overflow: "hidden",
          border: fill ? 0 : 1,
          borderColor: "divider",
        }}
      >
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

        {!cameraReady ? (
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
            {t("mediapipe.startingCamera")}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
