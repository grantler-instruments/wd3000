import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
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
  removeDebugLogEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startMqttListener, stopMqttListener } from "../lib/input";
import { createMonitorLogEvents } from "../lib/monitorLog";
import { isMonitorFilterActive, matchesDirectionFilter } from "../lib/monitorLogFilter";
import {
  clearReplaySession,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
  useReplaySession,
} from "../lib/monitorLogReplay";
import {
  defaultMqttClientPort,
  isMqttClientSupported,
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
  MQTT_DEFAULT_WS_PORT,
  type MqttTransportProtocol,
} from "../lib/mqtt";
import {
  type MqttMonitorConnectionStatus,
  resetMqttMonitorStatus,
  useMqttMonitorStatus,
} from "../lib/mqttMonitorStatus";
import { clampPort } from "../lib/network";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { useMonitorFilters } from "../store/useMonitorFilterStore";
import { useMonitorLogStore } from "../store/useMonitorLogStore";
import { DebuggerSection } from "./DebuggerSection";
import { debuggerFillSx, debuggerLogSx } from "./debuggerLayoutSx";
import { MonitorFilterAccordion } from "./MonitorFilterAccordion";
import { debugEntriesToListItems, MonitorLogList } from "./MonitorLogList";
import { MonitorLogToolbar } from "./MonitorLogToolbar";
import { MonitorReplaySection } from "./MonitorReplaySection";
import { MonitorReplayTabPanel } from "./MonitorReplayTabPanel";
import { MonitorSavedLogTabLabel } from "./MonitorSavedLogTabLabel";
import { MqttSubscriber } from "./MqttSubscriber";
import { SavedMonitorLogTab } from "./SavedMonitorLogTab";
import { useMonitorTabs } from "./useMonitorTabs";

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
  const replaySession = useReplaySession();
  const { tab, setTab, logs } = useMonitorTabs("mqtt");
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const { directionFilter, setDirectionFilter } = useMonitorFilters("mqtt");
  const monitorStatus = useMqttMonitorStatus();
  const native = isNativeApp();
  const protocolOptions: MqttTransportProtocol[] = native ? ["tcp", "ws"] : ["ws"];

  const subscribeTopics = output.mqttSubscribeTopics ?? [];
  const brokerHost = output.mqttMonitorHost || MQTT_DEFAULT_COMPOSER_HOST;
  const brokerPort =
    output.mqttMonitorPort || defaultMqttClientPort(output.mqttMonitorProtocol || "tcp");
  const brokerProtocol = output.mqttMonitorProtocol || (native ? "tcp" : "ws");
  const clientEnabled = isMqttClientSupported(brokerProtocol);

  const [host, setHost] = useState(brokerHost);
  const [port, setPort] = useState(brokerPort);
  const [protocol, setProtocol] = useState<MqttTransportProtocol>(brokerProtocol);

  const entries = useMemo(() => allEntries.filter(isMqttDebugEntry), [allEntries]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesDirectionFilter(entry.direction, directionFilter)),
    [directionFilter, entries],
  );

  const incomingCount = useMemo(
    () => entries.filter((entry) => entry.direction === "in").length,
    [entries],
  );
  const outgoingCount = useMemo(
    () => entries.filter((entry) => entry.direction === "out").length,
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

  const isReplayingLive = replayProgress.active && replayProgress.logId === liveLog.id;
  const listEntries = isReplayingLive
    ? debugEntriesToListItems(entries)
    : debugEntriesToListItems(filteredEntries);
  const replayEntries = useMemo(
    () => debugEntriesToListItems(replaySession.entries),
    [replaySession.entries],
  );
  const hasMqttReplay = replaySession.protocol === "mqtt";
  const tabValue =
    tab === "replay" && !hasMqttReplay
      ? "live"
      : tab !== "live" && tab !== "replay" && !logs.some((log) => log.id === tab)
        ? "live"
        : tab;

  const topicsLabel = formatTopicsLabel(subscribeTopics, t);

  useEffect(() => {
    if (replayProgress.active && hasMqttReplay) {
      setTab("replay");
    }
  }, [hasMqttReplay, replayProgress.active, setTab]);

  useEffect(() => {
    if (native || brokerProtocol === "ws") {
      return;
    }

    const nextPort = brokerPort === MQTT_DEFAULT_TCP_PORT ? MQTT_DEFAULT_WS_PORT : brokerPort;
    setOutput({
      mqttMonitorProtocol: "ws",
      mqttMonitorPort: nextPort,
    });
  }, [brokerPort, brokerProtocol, native, setOutput]);

  useEffect(() => {
    setHost(brokerHost);
    setPort(brokerPort);
    setProtocol(brokerProtocol);
  }, [brokerHost, brokerPort, brokerProtocol]);

  useEffect(() => {
    if (!clientEnabled) {
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
  }, [brokerHost, brokerPort, brokerProtocol, clientEnabled, setLastError, subscribeTopics]);

  return (
    <DebuggerSection title={t("monitor.monitor")} flexGrow>
      <Stack spacing={2} sx={debuggerFillSx}>
        <Tabs
          value={tabValue}
          onChange={(_, value: string) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flexShrink: 0,
            minHeight: 36,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label={t("common.live")} value="live" sx={{ minHeight: 36 }} />
          {logs.map((log) => (
            <Tab
              key={log.id}
              value={log.id}
              sx={{ minHeight: 36, pr: 0.5, textTransform: "none" }}
              label={
                <MonitorSavedLogTabLabel
                  name={log.name}
                  deleteDisabled={isMonitorLogReplayActive()}
                  onDelete={() => {
                    removeLog(log.id);
                    if (tab === log.id) {
                      setTab("live");
                    }
                  }}
                />
              }
            />
          ))}
          {(hasMqttReplay || tab === "replay") && (
            <Tab
              value="replay"
              sx={{ minHeight: 36, pr: 0.5 }}
              label={
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <span>{t("monitor.replay")}</span>
                  <IconButton
                    component="span"
                    size="small"
                    aria-label={t("common.close")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setTab("live");
                      clearReplaySession();
                    }}
                    sx={{ p: 0.25, ml: 0.25 }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              }
            />
          )}
        </Tabs>

        {tabValue === "live" ? (
          <Stack spacing={2} sx={debuggerFillSx}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                flexShrink: 0,
                alignItems: "flex-start",
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Button
                size="small"
                onClick={() => clearDebugLogFiltered(isMqttDebugEntry)}
                disabled={entries.length === 0}
              >
                {t("common.clear")}
              </Button>
              <MonitorLogToolbar
                protocol="mqtt"
                entries={entries}
                onSaved={setTab}
                onImported={setTab}
              />
            </Stack>

            <Stack spacing={1.5} sx={{ flexShrink: 0 }}>
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
                    value={protocolOptions.includes(protocol) ? protocol : "ws"}
                    onChange={(event) => {
                      const nextProtocol = event.target.value as MqttTransportProtocol;
                      setProtocol(nextProtocol);
                      const nextPort =
                        nextProtocol === "ws" && port === MQTT_DEFAULT_TCP_PORT
                          ? MQTT_DEFAULT_WS_PORT
                          : nextProtocol === "tcp" && port === MQTT_DEFAULT_WS_PORT
                            ? MQTT_DEFAULT_TCP_PORT
                            : port;
                      setPort(nextPort);
                      setOutput({
                        mqttMonitorProtocol: nextProtocol,
                        mqttMonitorPort: nextPort,
                      });
                    }}
                    disabled={!native && protocolOptions.length <= 1}
                  >
                    {protocolOptions.map((value) => (
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
                  disabled={!clientEnabled}
                  sx={{ minWidth: 180, flex: 1 }}
                />

                <TextField
                  label={t("common.port")}
                  size="small"
                  type="number"
                  value={port}
                  onChange={(event) => {
                    const nextPort = clampPort(
                      Number(event.target.value),
                      defaultMqttClientPort(protocol),
                    );
                    setPort(nextPort);
                    setOutput({ mqttMonitorPort: nextPort });
                  }}
                  disabled={!clientEnabled}
                  sx={{ width: 120 }}
                  slotProps={{
                    htmlInput: { min: 1, max: 65535 },
                  }}
                />
              </Stack>
            </Stack>

            <Box sx={{ flexShrink: 0 }}>
              <MqttSubscriber disabled={!clientEnabled} />
            </Box>

            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              <MonitorFilterAccordion
                protocol="mqtt"
                directionFilter={directionFilter}
                onDirectionFilterChange={setDirectionFilter}
              />

              <MonitorReplaySection
                log={liveLog}
                incomingCount={incomingCount}
                outgoingCount={outgoingCount}
              />
            </Stack>

            <Box sx={debuggerLogSx}>
              <MonitorLogList
                logId={liveLog.id}
                entries={listEntries}
                onRemoveEntry={removeDebugLogEntry}
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
        ) : tabValue === "replay" ? (
          <MonitorReplayTabPanel
            entries={replayEntries}
            emptyMessage={
              subscribeTopics.length > 0
                ? t("monitor.waitingMqtt", { topics: topicsLabel })
                : t("monitor.addTopicMqtt")
            }
          />
        ) : (
          <Box sx={debuggerLogSx}>
            <SavedMonitorLogTab
              protocol="mqtt"
              logId={tabValue}
              onDeleted={() => setTab("live")}
              onImported={setTab}
            />
          </Box>
        )}
      </Stack>
    </DebuggerSection>
  );
}
