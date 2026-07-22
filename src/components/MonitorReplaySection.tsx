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
import type { MonitorLogProtocol, SavedMonitorLog } from "../lib/monitorLog";
import {
  isMonitorLogReplayActive,
  type MonitorReplayDirection,
  type MonitorReplayTarget,
  replayMonitorLog,
  stopMonitorLogReplay,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";
import {
  defaultMqttClientPort,
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
  MQTT_DEFAULT_WS_PORT,
  type MqttTransportProtocol,
} from "../lib/mqtt";
import { listMidiOutputs } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { stackedAccordionSx } from "./stackedAccordionSx";

interface MonitorReplaySectionProps {
  log: SavedMonitorLog | null;
  incomingCount: number;
  outgoingCount: number;
}

const PROTOCOL_KEYS: Record<MonitorLogProtocol, string> = {
  midi: "protocols.midi",
  osc: "protocols.osc",
  mqtt: "protocols.mqtt",
  artnet: "protocols.artnet",
};

export function MonitorReplaySection({
  log,
  incomingCount,
  outgoingCount,
}: MonitorReplaySectionProps) {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const protocol = log?.protocol ?? "midi";
  const protocolLabel = t(PROTOCOL_KEYS[protocol]);

  const midiPortName = output.midiPortName ?? "";
  const oscHost = output.oscHost;
  const oscPort = output.oscPort;
  const mqttHost = output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST;
  const mqttPort =
    output.mqttComposerPort || defaultMqttClientPort(output.mqttComposerProtocol || "tcp");
  const mqttProtocol: MqttTransportProtocol =
    output.mqttComposerProtocol || (native ? "tcp" : "ws");
  const artnetHost = output.artnetHost;
  const artnetPort = output.artnetPort;

  const replayProgress = useMonitorLogReplayProgress();
  const replaying = replayProgress.active;
  const [expanded, setExpanded] = useState(false);
  const [sendPending, setSendPending] = useState(false);

  useEffect(() => {
    if (replaying) {
      setExpanded(true);
    }
  }, [replaying]);

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

  const replayTarget: MonitorReplayTarget = {
    protocol,
    midiPortName: midiPortName || null,
    oscHost: oscHost.trim(),
    oscPort,
    mqttHost: mqttHost.trim(),
    mqttPort,
    mqttProtocol,
    artnetHost: artnetHost.trim(),
    artnetPort,
  };

  const destinationReady =
    log !== null &&
    (protocol === "midi"
      ? Boolean(midiPortName)
      : protocol === "osc"
        ? native && Boolean(oscHost.trim()) && oscPort > 0
        : protocol === "mqtt"
          ? Boolean(mqttHost.trim()) && mqttPort > 0
          : native && Boolean(artnetHost.trim()) && artnetPort > 0);

  const canSendIncoming = destinationReady && incomingCount > 0;
  const canSendOutgoing = destinationReady && outgoingCount > 0;

  const handleSend = async (direction: MonitorReplayDirection) => {
    if (!log || sendPending || isMonitorLogReplayActive()) {
      return;
    }

    setSendPending(true);
    setLastError(null);

    try {
      await replayMonitorLog(log, replayTarget, direction);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setSendPending(false);
    }
  };

  const handleStop = () => {
    stopMonitorLogReplay();
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
                onChange={(event) => setOutput({ midiPortName: event.target.value || null })}
              >
                {midiPorts.map((port) => (
                  <MenuItem key={port} value={port}>
                    {port}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        ) : protocol === "osc" ? (
          !native ? (
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
                onChange={(event) => setOutput({ oscHost: event.target.value })}
              />
              <TextField
                label={t("common.port")}
                size="small"
                type="number"
                value={oscPort}
                onChange={(event) => setOutput({ oscPort: Number(event.target.value) || 0 })}
                sx={{ width: 120 }}
              />
            </Stack>
          )
        ) : protocol === "mqtt" ? (
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="monitor-replay-mqtt-protocol-label">
                {t("common.protocol")}
              </InputLabel>
              <Select
                labelId="monitor-replay-mqtt-protocol-label"
                label={t("common.protocol")}
                value={mqttProtocol}
                onChange={(event) => {
                  const nextProtocol = event.target.value as MqttTransportProtocol;
                  const nextPort =
                    nextProtocol === "ws" && mqttPort === MQTT_DEFAULT_TCP_PORT
                      ? MQTT_DEFAULT_WS_PORT
                      : nextProtocol === "tcp" && mqttPort === MQTT_DEFAULT_WS_PORT
                        ? MQTT_DEFAULT_TCP_PORT
                        : mqttPort;
                  setOutput({
                    mqttComposerProtocol: nextProtocol,
                    mqttComposerPort: nextPort,
                  });
                }}
              >
                {(native ? (["tcp", "ws"] as const) : (["ws"] as const)).map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`protocols.${value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t("common.host")}
              size="small"
              value={mqttHost}
              onChange={(event) => setOutput({ mqttComposerHost: event.target.value })}
              sx={{ minWidth: 160, flex: 1 }}
            />
            <TextField
              label={t("common.port")}
              size="small"
              type="number"
              value={mqttPort}
              onChange={(event) => setOutput({ mqttComposerPort: Number(event.target.value) || 0 })}
              sx={{ width: 120 }}
            />
          </Stack>
        ) : !native ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("monitor.artNetBrowserHint")}
          </Alert>
        ) : (
          <Stack direction="row" spacing={1} sx={{ mb: 2, maxWidth: 360 }}>
            <TextField
              label={t("monitor.sendToHost")}
              size="small"
              fullWidth
              value={artnetHost}
              onChange={(event) => setOutput({ artnetHost: event.target.value })}
            />
            <TextField
              label={t("common.port")}
              size="small"
              type="number"
              value={artnetPort}
              onChange={(event) => setOutput({ artnetPort: Number(event.target.value) || 0 })}
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
                disabled={!canSendIncoming || sendPending}
              >
                {t("monitor.sendIncoming", { count: incomingCount })}
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => void handleSend("out")}
                disabled={!canSendOutgoing || sendPending}
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
