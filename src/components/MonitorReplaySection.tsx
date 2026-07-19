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
import { useTranslation } from "react-i18next";
import type { SavedMonitorLog } from "../lib/monitorLog";
import {
  isMonitorLogReplayActive,
  type MonitorReplayDirection,
  type MonitorReplayTarget,
  replayMonitorLog,
  stopMonitorLogReplay,
} from "../lib/monitorLogReplay";
import { listMidiOutputs } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { stackedAccordionSx } from "./stackedAccordionSx";

interface MonitorReplaySectionProps {
  log: SavedMonitorLog | null;
  incomingCount: number;
  outgoingCount: number;
}

export function MonitorReplaySection({
  log,
  incomingCount,
  outgoingCount,
}: MonitorReplaySectionProps) {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const protocol = log?.protocol ?? "midi";
  const protocolLabel = protocol === "midi" ? t("protocols.midi") : t("protocols.osc");

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

  const destinationReady =
    log !== null &&
    (protocol === "midi"
      ? Boolean(midiPortName)
      : native && Boolean(oscHost.trim()) && oscPort > 0);

  const canSendIncoming = destinationReady && incomingCount > 0;
  const canSendOutgoing = destinationReady && outgoingCount > 0;

  const handleSend = async (direction: MonitorReplayDirection) => {
    if (!log) {
      return;
    }

    setReplaying(true);
    setLastError(null);

    try {
      await replayMonitorLog(log, replayTarget, direction);
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
      sx={stackedAccordionSx}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">{t("monitor.replay")}</Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("monitor.replayDestinationNote", { protocol: protocolLabel })}
        </Typography>

        {protocol === "midi" ? (
          midiPorts.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("monitor.noMidiOutputs")}
            </Alert>
          ) : (
            <FormControl fullWidth size="small" sx={{ mb: 2, maxWidth: 480 }}>
              <InputLabel id="monitor-replay-midi-out-label">{t("monitor.sendToPort")}</InputLabel>
              <Select
                labelId="monitor-replay-midi-out-label"
                label={t("monitor.sendToPort")}
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
            {t("monitor.oscSendNativeOnly")}
          </Alert>
        ) : (
          <Stack direction="row" spacing={1} sx={{ mb: 2, maxWidth: 360 }}>
            <TextField
              label={t("monitor.sendToHost")}
              size="small"
              fullWidth
              value={oscHost}
              onChange={(event) => setOscHost(event.target.value)}
            />
            <TextField
              label={t("common.port")}
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
              {t("common.stop")}
            </Button>
          ) : (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => void handleSend("in")}
                disabled={!canSendIncoming}
              >
                {t("monitor.sendIncoming", { count: incomingCount })}
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => void handleSend("out")}
                disabled={!canSendOutgoing}
              >
                {t("monitor.sendOutgoing", { count: outgoingCount })}
              </Button>
            </>
          )}
          {incomingCount === 0 && outgoingCount === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t("monitor.noMessagesYet")}
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
