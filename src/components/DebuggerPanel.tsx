import { Box, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDebuggerEvents } from "../hooks/useDebuggerEvents";
import { useAppStore } from "../store/useAppStore";
import { ArtNetComposer } from "./ArtNetComposer";
import { ArtNetMonitor } from "./ArtNetMonitor";
import { MidiComposer } from "./MidiComposer";
import { MidiMonitor } from "./MidiMonitor";
import { MqttBroker } from "./MqttBroker";
import { MqttComposer } from "./MqttComposer";
import { MqttMonitor } from "./MqttMonitor";
import { NativeOnlyAlert } from "./NativeOnlyAlert";
import { OscComposer } from "./OscComposer";
import { OscMonitor } from "./OscMonitor";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
import { TuioMonitor } from "./tuioMonitor";

/** Fill the viewport; monitor details scroll inside their panel. */
const debuggerStackSx = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
} as const;

const debuggerMonitorSx = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
} as const;

export function DebuggerPanel() {
  const { t } = useTranslation();
  const tab = useAppStore((state) => state.debuggerSubView);

  useDebuggerEvents();

  return (
    <PanelErrorBoundary title={t("monitor.debuggerFailed")}>
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
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            p: { xs: 1.5, sm: 3 },
          }}
        >
          {tab === "midi" ? (
            <Stack spacing={1} sx={debuggerStackSx}>
              <MidiComposer />
              <Box sx={debuggerMonitorSx}>
                <MidiMonitor />
              </Box>
            </Stack>
          ) : tab === "osc" ? (
            <Stack spacing={1} sx={debuggerStackSx}>
              <NativeOnlyAlert protocol="osc" />
              <OscComposer />
              <Box sx={debuggerMonitorSx}>
                <OscMonitor />
              </Box>
            </Stack>
          ) : tab === "artnet" ? (
            <Stack spacing={1} sx={debuggerStackSx}>
              <NativeOnlyAlert protocol="artnet" />
              <ArtNetComposer />
              <Box sx={debuggerMonitorSx}>
                <ArtNetMonitor />
              </Box>
            </Stack>
          ) : tab === "mqtt" ? (
            <Stack spacing={1} sx={debuggerStackSx}>
              <NativeOnlyAlert protocol="mqtt" />
              <MqttComposer />
              <MqttMonitor />
              <MqttBroker />
            </Stack>
          ) : tab === "tuio" ? (
            <Stack spacing={1} sx={debuggerStackSx}>
              <NativeOnlyAlert protocol="tuio" />
              <TuioMonitor />
            </Stack>
          ) : null}
        </Box>
      </Box>
    </PanelErrorBoundary>
  );
}
