import { Box, Radio, Tooltip } from "@mui/material";
import type { LandmarkHotspot } from "../../lib/mediapipe/landmarks";

interface LandmarkPickerProps {
  sketch: string;
  landmarks: LandmarkHotspot[];
  offset?: { x: number; y: number };
  selectedLandmarks: string[];
  onToggleLandmark: (landmark: string) => void;
}

export function LandmarkPicker({
  sketch,
  landmarks,
  offset = { x: 0, y: 0 },
  selectedLandmarks,
  onToggleLandmark,
}: LandmarkPickerProps) {
  return (
    <Box sx={{ position: "relative", width: "fit-content" }}>
      <Box
        component="img"
        src={sketch}
        alt=""
        sx={{ opacity: 0.15, display: "block", maxWidth: "100%" }}
      />
      <Box sx={{ position: "absolute", inset: 0 }}>
        {landmarks.map((landmark) => (
          <Tooltip key={landmark.label} title={landmark.label} placement="right">
            <Box
              sx={{
                position: "absolute",
                left: landmark.x + offset.x,
                top: landmark.y + offset.y,
              }}
            >
              <Radio
                size="small"
                checked={selectedLandmarks.includes(landmark.label)}
                onClick={() => onToggleLandmark(landmark.label)}
                aria-label={landmark.label}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
