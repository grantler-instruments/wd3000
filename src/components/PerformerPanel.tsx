import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useAppStore } from "../store/useAppStore";
import { settingsTheme } from "../theme";
import { ControlCanvas } from "./ControlCanvas";
import { MediaPipePerformerPanel } from "./MediaPipePerformerPanel";
import { PerformerToolbar } from "./PerformerToolbar";
import { SensorsPanel } from "./sensors/SensorsPanel";

export function PerformerPanel() {
  const tab = useAppStore((state) => state.performerSubView);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: tab === "ui" ? "flex" : "none",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ThemeProvider theme={settingsTheme}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <PerformerToolbar />
            <ControlCanvas editable />
          </Box>
        </ThemeProvider>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: tab === "sensors" ? "flex" : "none",
          flexDirection: "column",
          overflow: "auto",
          p: 3,
        }}
      >
        <SensorsPanel />
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: tab === "mediapipe" ? "flex" : "none",
          flexDirection: "column",
          overflow: "auto",
          p: 3,
        }}
      >
        <MediaPipePerformerPanel />
      </Box>
    </Box>
  );
}
