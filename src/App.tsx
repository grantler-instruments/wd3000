import {
  Alert,
  Box,
  Snackbar,
  ThemeProvider,
} from "@mui/material";
import { useEffect } from "react";
import { PageHeader } from "./components/PageHeader";
import { ControlCanvas } from "./components/ControlCanvas";
import { HomePage } from "./components/HomePage";
import { PlayModeBezelExit } from "./components/PlayModeBezelExit";
import { ControlPerformerDialog } from "./components/ControlPerformer";
import { DebuggerPanel } from "./components/DebuggerPanel";
import { PerformerPanel } from "./components/PerformerPanel";
import { useInputControl } from "./hooks/useInputControl";
import { useControlClipboardShortcuts } from "./hooks/useControlClipboardShortcuts";
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
  const isEditMode = mode === "edit";

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

      if (event.key !== "e") {
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (mode === "play") {
        setMode("edit");
        return;
      }

      if (activeView === "performer" && performerSubView === "ui") {
        setMode("play");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeView, mode, performerSubView, setMode]);

  if (!isEditMode) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%" }}>
        <ThemeProvider theme={playTheme}>
          <ControlCanvas editable={false} />
          <PlayModeBezelExit onExit={() => setMode("edit")} />
        </ThemeProvider>

        <Snackbar
          open={Boolean(lastError)}
          autoHideDuration={5000}
          onClose={() => setLastError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="error" onClose={() => setLastError(null)} sx={{ width: "100%" }}>
            {lastError}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {activeView === "home" ? (
        <HomePage />
      ) : (
        <>
          <PageHeader />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            {activeView === "performer" && <PerformerPanel />}
            {activeView === "debugger" && <DebuggerPanel />}
          </Box>
        </>
      )}

      <ControlPerformerDialog />

      <Snackbar
        open={Boolean(lastError)}
        autoHideDuration={5000}
        onClose={() => setLastError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setLastError(null)} sx={{ width: "100%" }}>
          {lastError}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
