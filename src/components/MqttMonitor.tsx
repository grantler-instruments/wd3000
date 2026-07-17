import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearDebugLogFiltered,
  isMqttDebugEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startMqttListener, stopMqttListener } from "../lib/input";
import {
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
  type MqttTransportProtocol,
} from "../lib/mqtt";
import { createMonitorLogEvents } from "../lib/monitorLog";
import {
  resetMqttMonitorStatus,
  useMqttMonitorStatus,
  type MqttMonitorConnectionStatus,
} from "../lib/mqttMonitorStatus";
import {
  defaultMonitorDirectionFilter,
  isMonitorFilterActive,
  matchesDirectionFilter,
} from "../lib/monitorLogFilter";
import { isNativeApp } from "../lib/platform";
import { useMonitorLogReplayProgress } from "../lib/monitorLogReplay";
import { useAppStore } from "../store/useAppStore";
import { debugEntriesToListItems, MonitorLogList } from "./MonitorLogList";
import { MonitorFilterAccordion } from "./MonitorFilterAccordion";
import { MonitorLogToolbar } from "./MonitorLogToolbar";
import { MonitorReplaySection } from "./MonitorReplaySection";
import { DebuggerSection } from "./DebuggerSection";
import { MqttSubscriber } from "./MqttSubscriber";
import { SavedMonitorLogTab } from "./SavedMonitorLogTab";
import { useOpenSavedLogOnReplay } from "./useOpenSavedLogOnReplay";

type MonitorTab = "live" | "saved";

const PROTOCOL_OPTIONS: MqttTransportProtocol[] = ["tcp", "ws"];

function clampPort(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 1 || value > 65535) {
    return fallback;
  }
  return Math.round(value);
}

type StatusChipColor = "default" | "success" | "warning" | "error";

function describeMonitorStatus(
  status: MqttMonitorConnectionStatus,
  t: TFunction,
): {
  label: string;
  color: StatusChipColor;
} {
  switch (status) {
    case "connected":
      return { label: t("monitor.connected"), color: "success" };
    case "connecting":
      return { label: t("monitor.connecting"), color: "warning" };
    case "disconnected":
      return { label: t("monitor.disconnected"), color: "error" };
    case "idle":
    default:
      return { label: t("monitor.notConnected"), color: "default" };
  }
}

function formatTopicsLabel(topics: string[], t: TFunction) {
  if (topics.length === 0) {
    return "";
  }
  if (topics.length === 1) {
    return topics[0];
  }
  return t("monitor.topicsCount", { count: topics.length });
}

export function MqttMonitor() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const monitorStatus = useMqttMonitorStatus();
  const native = isNativeApp();

  const subscribeTopics = output.mqttSubscribeTopics ?? [];
  const brokerHost = output.mqttMonitorHost || MQTT_DEFAULT_COMPOSER_HOST;
  const brokerPort = output.mqttMonitorPort || MQTT_DEFAULT_TCP_PORT;
  const brokerProtocol = output.mqttMonitorProtocol || "tcp";

  const [tab, setTab] = useState<MonitorTab>("live");
  const [host, setHost] = useState(brokerHost);
  const [port, setPort] = useState(brokerPort);
  const [protocol, setProtocol] = useState<MqttTransportProtocol>(brokerProtocol);
  useOpenSavedLogOnReplay("mqtt", setTab);
  const [directionFilter, setDirectionFilter] = useState(defaultMonitorDirectionFilter);

  const entries = useMemo(
    () => allEntries.filter(isMqttDebugEntry),
    [allEntries],
  );

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesDirectionFilter(entry.direction, directionFilter)),
    [directionFilter, entries],
  );

  const incomingCount = useMemo(
    () => entries.filter((entry) => entry.direction === "in").length,
    [entries],
  );

  const liveLog = useMemo(
    () => ({
      id: "live-monitor",
      name: t("monitor.liveMonitor"),
      protocol: "mqtt" as const,
      savedAt: new Date().toISOString(),
      events: createMonitorLogEvents(entries),
    }),
    [entries, t],
  );

  const isReplayingLive =
    replayProgress.active && replayProgress.logId === liveLog.id;
  const listEntries = isReplayingLive
    ? debugEntriesToListItems(entries)
    : debugEntriesToListItems(filteredEntries);

  const topicsLabel = formatTopicsLabel(subscribeTopics, t);

  useEffect(() => {
    setHost(brokerHost);
    setPort(brokerPort);
    setProtocol(brokerProtocol);
  }, [brokerHost, brokerPort, brokerProtocol]);

  useEffect(() => {
    if (!native) {
      return;
    }

    let cancelled = false;

    const syncListener = async () => {
      try {
        if (subscribeTopics.length > 0) {
          await startMqttListener({
            host: brokerHost,
            port: brokerPort,
            protocol: brokerProtocol,
            topics: subscribeTopics,
          });
        } else {
          await stopMqttListener();
          resetMqttMonitorStatus();
        }
        if (!cancelled) {
          setLastError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void syncListener();

    return () => {
      cancelled = true;
      void stopMqttListener();
      resetMqttMonitorStatus();
    };
  }, [
    brokerHost,
    brokerPort,
    brokerProtocol,
    native,
    setLastError,
    subscribeTopics,
  ]);

  return (
    <DebuggerSection title={t("monitor.monitor")} defaultExpanded>
      <Stack spacing={2}>
        <Tabs
          value={tab}
          onChange={(_, value: MonitorTab) => setTab(value)}
          sx={{
            minHeight: 36,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label={t("common.live")} value="live" sx={{ minHeight: 36 }} />
          <Tab label={t("common.saved")} value="saved" sx={{ minHeight: 36 }} />
        </Tabs>

        {tab === "live" ? (
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "flex-start",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Button
                size="small"
                onClick={() => clearDebugLogFiltered(isMqttDebugEntry)}
                disabled={!native || entries.length === 0}
              >
                {t("common.clear")}
              </Button>
              <MonitorLogToolbar protocol="mqtt" entries={entries} />
            </Stack>

            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography variant="subtitle2">{t("common.broker")}</Typography>
                {(() => {
                  const effectiveStatus: MqttMonitorConnectionStatus =
                    subscribeTopics.length === 0 ? "idle" : monitorStatus.status;
                  const { label, color } = describeMonitorStatus(effectiveStatus, t);
                  const chip = (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={color}
                      label={label}
                      sx={{ textTransform: "none" }}
                    />
                  );
                  return monitorStatus.detail ? (
                    <Tooltip title={monitorStatus.detail}>{chip}</Tooltip>
                  ) : (
                    chip
                  );
                })()}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel id="mqtt-monitor-protocol-label">{t("common.protocol")}</InputLabel>
                  <Select
                    labelId="mqtt-monitor-protocol-label"
                    label={t("common.protocol")}
                    value={protocol}
                    onChange={(event) => {
                      const nextProtocol = event.target.value as MqttTransportProtocol;
                      setProtocol(nextProtocol);
                      setOutput({ mqttMonitorProtocol: nextProtocol });
                    }}
                    disabled={!native}
                  >
                    {PROTOCOL_OPTIONS.map((value) => (
                      <MenuItem key={value} value={value}>
                        {t(`protocols.${value}`)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label={t("common.host")}
                  size="small"
                  value={host}
                  onChange={(event) => {
                    const nextHost = event.target.value;
                    setHost(nextHost);
                    setOutput({ mqttMonitorHost: nextHost });
                  }}
                  disabled={!native}
                  sx={{ minWidth: 180, flex: 1 }}
                />

                <TextField
                  label={t("common.port")}
                  size="small"
                  type="number"
                  value={port}
                  onChange={(event) => {
                    const nextPort = clampPort(Number(event.target.value), MQTT_DEFAULT_TCP_PORT);
                    setPort(nextPort);
                    setOutput({ mqttMonitorPort: nextPort });
                  }}
                  disabled={!native}
                  sx={{ width: 120 }}
                  slotProps={{
                    htmlInput: { min: 1, max: 65535 },
                  }}
                />
              </Stack>
            </Stack>

            <MqttSubscriber />

            <Stack spacing={1}>
              <MonitorFilterAccordion
                protocol="mqtt"
                directionFilter={directionFilter}
                onDirectionFilterChange={setDirectionFilter}
              />

              <MonitorReplaySection log={liveLog} incomingCount={incomingCount} />
            </Stack>

            <Box
              sx={{
                minHeight: 200,
                maxHeight: 360,
                overflow: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <MonitorLogList
                logId={liveLog.id}
                entries={listEntries}
                emptyMessage={
                  entries.length === 0
                    ? subscribeTopics.length > 0
                      ? t("monitor.waitingMqtt", { topics: topicsLabel })
                      : t("monitor.addTopicMqtt")
                    : isReplayingLive
                      ? t("monitor.waitingMqtt", { topics: topicsLabel })
                      : isMonitorFilterActive(directionFilter)
                        ? t("monitor.noFilterMatch")
                        : t("monitor.waitingMqtt", { topics: topicsLabel })
                }
              />
            </Box>
          </Stack>
        ) : (
          <SavedMonitorLogTab protocol="mqtt" />
        )}
      </Stack>
    </DebuggerSection>
  );
}
