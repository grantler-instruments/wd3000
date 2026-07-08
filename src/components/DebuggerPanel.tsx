import { Box, Divider, Stack } from "@mui/material";
import { useDebuggerEvents } from "../hooks/useDebuggerEvents";
import { useAppStore } from "../store/useAppStore";
import { ArtNetComposer } from "./ArtNetComposer";
import { ArtNetMonitor } from "./ArtNetMonitor";
import { DebuggerErrorBoundary } from "./DebuggerErrorBoundary";
import { MidiComposer } from "./MidiComposer";
import { MidiMonitor } from "./MidiMonitor";
import { OscComposer } from "./OscComposer";
import { OscMonitor } from "./OscMonitor";
import { TuioMonitor } from "./TuioMonitor";

export function DebuggerPanel() {
  const tab = useAppStore((state) => state.debuggerSubView);

  useDebuggerEvents();

  return (
    <DebuggerErrorBoundary>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            p: 3,
          }}
        >
          {tab === "midi" ? (
            <Stack spacing={0} sx={{ minHeight: 0, height: "100%" }}>
              <MidiComposer />
              <Divider sx={{ my: 3 }} />
              <Box sx={{ flex: 1, minHeight: 280, display: "flex", flexDirection: "column" }}>
                <MidiMonitor />
              </Box>
            </Stack>
          ) : tab === "osc" ? (
            <Stack spacing={0} sx={{ minHeight: 0, height: "100%" }}>
              <OscComposer />
              <Divider sx={{ my: 3 }} />
              <Box sx={{ flex: 1, minHeight: 280, display: "flex", flexDirection: "column" }}>
                <OscMonitor />
              </Box>
            </Stack>
          ) : tab === "artnet" ? (
            <Stack spacing={0} sx={{ minHeight: 0, height: "100%" }}>
              <ArtNetComposer />
              <Divider sx={{ my: 3 }} />
              <Box sx={{ flex: 1, minHeight: 280, display: "flex", flexDirection: "column" }}>
                <ArtNetMonitor />
              </Box>
            </Stack>
          ) : (
            <Box
              sx={{
                height: "100%",
                minHeight: 280,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <TuioMonitor />
            </Box>
          )}
        </Box>
      </Box>
    </DebuggerErrorBoundary>
  );
}
