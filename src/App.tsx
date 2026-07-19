import { Alert, Box, Snackbar, ThemeProvider } from "@mui/material";
import { useEffect, useState } from "react";
import { ControlCanvas } from "./components/ControlCanvas";
import { ControlPerformerDialog } from "./components/ControlPerformer";
import { DebuggerPanel } from "./components/DebuggerPanel";
import { HomePage } from "./components/HomePage";
import { IoSettingsDialog } from "./components/IoSettingsDialog";
import { MediaPipePlayView } from "./components/mediapipe/MediaPipePlayView";
import { PageHeader } from "./components/PageHeader";
import { PerformerPanel } from "./components/PerformerPanel";
import { PlayModeBezelExit } from "./components/PlayModeBezelExit";
import { useControlClipboardShortcuts } from "./hooks/useControlClipboardShortcuts";
import { useInputControl } from "./hooks/useInputControl";
import { usePerformerHistory } from "./hooks/usePerformerHistory";
import { isTextInputTarget } from "./lib/platform";
import { useAppStore } from "./store/useAppStore";
import { playTheme } from "./theme";

function App() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const activeView = useAppStore((state) => state.activeView);
  const performerSubView = useAppStore((state) => state.performerSubView);
  const lastError = useAppStore((state) => state.lastError);
  const setLastError = useAppStore((state) => state.setLastError);
  const [ioSettingsOpen, setIoSettingsOpen] = useState(false);
  const isEditMode = mode === "edit";
  const canRunPerformer =
    activeView === "performer" && (performerSubView === "ui" || performerSubView === "mediapipe");

  useInputControl();
  usePerformerHistory();
  useControlClipboardShortcuts(
    isEditMode && activeView === "performer" && performerSubView === "ui",
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === ",") {
        event.preventDefault();
        setIoSettingsOpen(true);
        return;
      }

      if (key !== "e") {
        return;
      }

      event.preventDefault();

      if (mode === "play") {
        setMode("edit");
        return;
      }

      if (canRunPerformer) {
        setMode("play");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRunPerformer, mode, setMode]);

  return (
    <>
      {!isEditMode ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            maxHeight: "100%",
            width: "100%",
          }}
        >
          <ThemeProvider theme={playTheme}>
            {performerSubView === "mediapipe" ? (
              <MediaPipePlayView />
            ) : (
              <ControlCanvas editable={false} />
            )}
            <PlayModeBezelExit onExit={() => setMode("edit")} />
          </ThemeProvider>

          <Snackbar
            open={Boolean(lastError)}
            autoHideDuration={20000}
            onClose={() => setLastError(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert severity="error" onClose={() => setLastError(null)} sx={{ width: "100%" }}>
              {lastError}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            maxHeight: "100%",
            width: "100%",
          }}
        >
          {activeView === "home" ? (
            <HomePage onOpenSettings={() => setIoSettingsOpen(true)} />
          ) : (
            <>
              <PageHeader />

              <Box sx={{ flex: 1, minHeight: 0, width: "100%", display: "flex" }}>
                {activeView === "performer" && <PerformerPanel />}
                {activeView === "debugger" && <DebuggerPanel />}
              </Box>
            </>
          )}

          <ControlPerformerDialog />

          <Snackbar
            open={Boolean(lastError)}
            autoHideDuration={20000}
            onClose={() => setLastError(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert severity="error" onClose={() => setLastError(null)} sx={{ width: "100%" }}>
              {lastError}
            </Alert>
          </Snackbar>
        </Box>
      )}

      <IoSettingsDialog open={ioSettingsOpen} onClose={() => setIoSettingsOpen(false)} />
    </>
  );
}

export default App;
