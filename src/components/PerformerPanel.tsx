import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useAppStore } from "../store/useAppStore";
import { settingsTheme } from "../theme";
import { ControlCanvas } from "./ControlCanvas";
import { MediaPipePerformerPanel } from "./MediaPipePerformerPanel";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
import { SensorsPanel } from "./sensors/SensorsPanel";

export function PerformerPanel() {
  const tab = useAppStore((state) => state.performerSubView);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PanelErrorBoundary title="Performer panel crashed.">
        {tab === "ui" ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
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
                <ControlCanvas editable />
              </Box>
            </ThemeProvider>
          </Box>
        ) : null}

        {tab === "sensors" ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
              p: 3,
              bgcolor: "background.default",
            }}
          >
            <SensorsPanel />
          </Box>
        ) : null}

        {tab === "mediapipe" ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
              p: 3,
            }}
          >
            <ThemeProvider theme={settingsTheme}>
              <MediaPipePerformerPanel />
            </ThemeProvider>
          </Box>
        ) : null}
      </PanelErrorBoundary>
    </Box>
  );
}
