import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HAND_LANDMARK_HOTSPOTS,
  HAND_LANDMARK_LABELS,
  POSE_BODY_HOTSPOTS,
  POSE_FACE_HOTSPOTS,
  POSE_HANDS_HOTSPOTS,
  POSE_LANDMARK_LABELS,
  mediapipeSketchPath,
} from "../lib/mediapipe/landmarks";
import { mediaPipeLandmarkKeysForSelection } from "../lib/mediapipe/types";
import type { MediaPipeLandmark } from "../lib/mediapipe/types";
import { useAppStore } from "../store/useAppStore";
import { LandmarkMappingEditor } from "./mediapipe/LandmarkMappingEditor";
import { LandmarkPicker } from "./mediapipe/LandmarkPicker";
import { MediaPipePreview, stopMediaPipeTracking } from "./mediapipe/MediaPipePreview";

const POSE_PICKER_TABS = [
  { label: "Body", sketch: mediapipeSketchPath("body.svg"), landmarks: POSE_BODY_HOTSPOTS },
  { label: "Face", sketch: mediapipeSketchPath("face.svg"), landmarks: POSE_FACE_HOTSPOTS },
  { label: "Hands", sketch: mediapipeSketchPath("hands.svg"), landmarks: POSE_HANDS_HOTSPOTS },
] as const;

export function MediaPipePerformerPanel() {
  const mediapipeConfig = useAppStore((state) => state.mediapipeConfig);
  const setMediaPipeTracker = useAppStore((state) => state.setMediaPipeTracker);
  const setMediaPipeVideoDevice = useAppStore((state) => state.setMediaPipeVideoDevice);
  const setMediaPipeActive = useAppStore((state) => state.setMediaPipeActive);
  const toggleMediaPipeLandmark = useAppStore((state) => state.toggleMediaPipeLandmark);
  const clearMediaPipeLandmarks = useAppStore((state) => state.clearMediaPipeLandmarks);
  const addMediaPipeLandmarks = useAppStore((state) => state.addMediaPipeLandmarks);
  const setLastError = useAppStore((state) => state.setLastError);
  const lastError = useAppStore((state) => state.lastError);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [poseTab, setPoseTab] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<Record<string, MediaPipeLandmark>>({});

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) =>
      setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
    [],
  );

  useEffect(() => {
    void navigator.mediaDevices
      .enumerateDevices()
      .then(handleDevices)
      .catch((error) => {
        setCameraError(error instanceof Error ? error.message : String(error));
      });
  }, [handleDevices, mediapipeConfig.active]);

  useEffect(() => {
    if (!mediapipeConfig.active) {
      stopMediaPipeTracking();
    }
  }, [mediapipeConfig.active, mediapipeConfig.tracker, mediapipeConfig.videoDeviceId]);

  const mappingKeys = useMemo(
    () =>
      mediapipeConfig.selectedLandmarks.flatMap((landmark) =>
        mediaPipeLandmarkKeysForSelection(mediapipeConfig.tracker, landmark),
      ),
    [mediapipeConfig.selectedLandmarks, mediapipeConfig.tracker],
  );

  const allLandmarkLabels =
    mediapipeConfig.tracker === "pose"
      ? [...POSE_LANDMARK_LABELS]
      : [...HAND_LANDMARK_LABELS];

  const handleSelectAllLandmarks = () => {
    if (mediapipeConfig.tracker === "pose") {
      const tab = POSE_PICKER_TABS[poseTab];
      addMediaPipeLandmarks(tab.landmarks.map((landmark) => landmark.label));
      return;
    }

    addMediaPipeLandmarks(allLandmarkLabels);
  };

  const landmarkPicker = (
    <Box sx={{ minWidth: 0 }}>
      {mediapipeConfig.tracker === "pose" ? (
        <Stack spacing={2}>
          <Tabs value={poseTab} onChange={(_, value) => setPoseTab(value)}>
            {POSE_PICKER_TABS.map((tab, index) => (
              <Tab key={tab.label} label={tab.label} value={index} />
            ))}
          </Tabs>
          {POSE_PICKER_TABS.map((tab, index) => (
            <Box key={tab.label} sx={{ display: poseTab === index ? "block" : "none" }}>
              <LandmarkPicker
                sketch={tab.sketch}
                landmarks={tab.landmarks}
                offset={{ x: -14, y: -12 }}
                selectedLandmarks={mediapipeConfig.selectedLandmarks}
                onToggleLandmark={toggleMediaPipeLandmark}
              />
            </Box>
          ))}
        </Stack>
      ) : (
        <LandmarkPicker
          sketch={mediapipeSketchPath("hand.svg")}
          landmarks={HAND_LANDMARK_HOTSPOTS}
          offset={{ x: 8, y: -10 }}
          selectedLandmarks={mediapipeConfig.selectedLandmarks}
          onToggleLandmark={toggleMediaPipeLandmark}
        />
      )}

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline", mt: 1.5 }}>
        <Typography
          component="button"
          type="button"
          variant="caption"
          onClick={handleSelectAllLandmarks}
          sx={{
            border: 0,
            background: "none",
            p: 0,
            m: 0,
            font: "inherit",
            color: "common.white",
            cursor: "pointer",
            opacity: 0.85,
            "&:hover": { opacity: 1 },
          }}
        >
          Select all
        </Typography>
        <Typography
          component="button"
          type="button"
          variant="caption"
          onClick={clearMediaPipeLandmarks}
          sx={{
            border: 0,
            background: "none",
            p: 0,
            m: 0,
            font: "inherit",
            color: "common.white",
            cursor: "pointer",
            opacity: 0.85,
            "&:hover": { opacity: 1 },
          }}
        >
          Clear
        </Typography>
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200 }}>
      <Box>
        <Typography variant="h6" gutterBottom>
          MediaPipe
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track pose or hand landmarks from your camera and route coordinates to OSC, MQTT, or
          MIDI using the shared performer I/O settings.
        </Typography>
      </Box>

      {cameraError ? <Alert severity="warning">{cameraError}</Alert> : null}
      {lastError ? (
        <Alert severity="error" onClose={() => setLastError(null)}>
          {lastError}
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { md: "center" } }}
      >
        <Tabs
          value={mediapipeConfig.tracker}
          onChange={(_, value: "pose" | "hands") => setMediaPipeTracker(value)}
        >
          <Tab label="Hands" value="hands" />
          <Tab label="Pose" value="pose" />
        </Tabs>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="mediapipe-camera-label">Camera</InputLabel>
          <Select
            labelId="mediapipe-camera-label"
            label="Camera"
            value={mediapipeConfig.videoDeviceId ?? ""}
            onChange={(event) =>
              setMediaPipeVideoDevice(event.target.value ? event.target.value : null)
            }
          >
            <MenuItem value="">Default camera</MenuItem>
            {devices.map((device) => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2">Tracking</Typography>
          <Switch
            checked={mediapipeConfig.active}
            onChange={(_, checked) => setMediaPipeActive(checked)}
            aria-label="Toggle MediaPipe tracking"
          />
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        sx={{ alignItems: { md: "flex-start" } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MediaPipePreview onLiveValues={setLiveValues} />
        </Box>
        {landmarkPicker}
      </Stack>

      {mappingKeys.length > 0 ? (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Output mappings
          </Typography>
          <Stack spacing={1}>
            {mappingKeys.map((mappingKey) => {
              const parts = mappingKey.split(":");
              const liveKey =
                parts[0] === "pose"
                  ? parts[1]
                  : `${parts[1]}:${parts[2]}`;

              return (
                <LandmarkMappingEditor
                  key={mappingKey}
                  mappingKey={mappingKey}
                  liveValue={liveValues[liveKey ?? ""]}
                />
              );
            })}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
