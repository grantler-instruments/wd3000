import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { SavedMonitorLog } from "../lib/monitorLog";
import {
  isMonitorLogReplayActive,
  replayMonitorLog,
  stopMonitorLogReplay,
  type MonitorReplayTarget,
} from "../lib/monitorLogReplay";
import { listMidiOutputs } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";

interface MonitorReplaySectionProps {
  log: SavedMonitorLog | null;
  incomingCount: number;
}

export function MonitorReplaySection({ log, incomingCount }: MonitorReplaySectionProps) {
  const output = useAppStore((state) => state.output);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const protocol = log?.protocol ?? "midi";
  const protocolLabel = protocol === "midi" ? "MIDI" : "OSC";

  const [midiPortName, setMidiPortName] = useState(output.midiPortName ?? "");
  const [oscHost, setOscHost] = useState(output.oscHost);
  const [oscPort, setOscPort] = useState(output.oscPort);
  const [replaying, setReplaying] = useState(isMonitorLogReplayActive());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (replaying) {
      setExpanded(true);
    }
  }, [replaying]);

  useEffect(() => {
    setMidiPortName(output.midiPortName ?? "");
    setOscHost(output.oscHost);
    setOscPort(output.oscPort);
  }, [output.midiPortName, output.oscHost, output.oscPort]);

  useEffect(() => {
    if (protocol !== "midi" || midiPorts.length > 0) {
      return;
    }

    void listMidiOutputs()
      .then(setMidiPorts)
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  }, [midiPorts.length, protocol, setLastError, setMidiPorts]);

  const replayTarget: MonitorReplayTarget =
    protocol === "midi"
      ? {
          protocol: "midi",
          midiPortName: midiPortName || null,
          oscHost: output.oscHost,
          oscPort: output.oscPort,
        }
      : {
          protocol: "osc",
          midiPortName: null,
          oscHost: oscHost.trim(),
          oscPort,
        };

  const canSend =
    incomingCount > 0 &&
    log !== null &&
    (protocol === "midi"
      ? Boolean(midiPortName)
      : native && Boolean(oscHost.trim()) && oscPort > 0);

  const handleSend = async () => {
    if (!log) {
      return;
    }

    setReplaying(true);
    setLastError(null);

    try {
      await replayMonitorLog(log, replayTarget);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setReplaying(isMonitorLogReplayActive());
    }
  };

  const handleStop = () => {
    stopMonitorLogReplay();
    setReplaying(false);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "action.hover",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Replay</Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Re-sends incoming messages from the log below to a {protocolLabel} destination.
          This is separate from the listen port above.
        </Typography>

        {protocol === "midi" ? (
        midiPorts.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No MIDI output ports found.
          </Alert>
        ) : (
          <FormControl fullWidth size="small" sx={{ mb: 2, maxWidth: 480 }}>
            <InputLabel id="monitor-replay-midi-out-label">Send to port</InputLabel>
            <Select
              labelId="monitor-replay-midi-out-label"
              label="Send to port"
              value={midiPortName}
              onChange={(event) => setMidiPortName(event.target.value)}
            >
              {midiPorts.map((port) => (
                <MenuItem key={port} value={port}>
                  {port}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      ) : !native ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          OSC send is only available in the native app.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} sx={{ mb: 2, maxWidth: 360 }}>
          <TextField
            label="Send to host"
            size="small"
            fullWidth
            value={oscHost}
            onChange={(event) => setOscHost(event.target.value)}
          />
          <TextField
            label="Port"
            size="small"
            type="number"
            value={oscPort}
            onChange={(event) => setOscPort(Number(event.target.value) || 0)}
            sx={{ width: 120 }}
          />
        </Stack>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {replaying ? (
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<StopIcon />}
            onClick={handleStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleSend}
            disabled={!canSend}
          >
            Send {incomingCount} incoming
          </Button>
        )}
        {incomingCount === 0 && (
          <Typography variant="body2" color="text.secondary">
            No incoming messages captured yet.
          </Typography>
        )}
      </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
