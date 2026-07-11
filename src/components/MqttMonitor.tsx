import {
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  clearDebugLogFiltered,
  isMqttDebugEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startMqttListener, stopMqttListener } from "../lib/input";
import {
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
} from "../lib/mqtt";
import { createMonitorLogEvents } from "../lib/monitorLog";
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

function formatTopicsLabel(topics: string[]) {
  if (topics.length === 0) {
    return "";
  }
  if (topics.length === 1) {
    return topics[0];
  }
  return `${topics.length} topics`;
}

export function MqttMonitor() {
  const output = useAppStore((state) => state.output);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const native = isNativeApp();

  const subscribeTopics = output.mqttSubscribeTopics ?? [];
  const brokerHost = output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST;
  const brokerPort = output.mqttComposerPort || MQTT_DEFAULT_TCP_PORT;
  const brokerProtocol = output.mqttComposerProtocol || "tcp";

  const [tab, setTab] = useState<MonitorTab>("live");
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
      name: "Live monitor",
      protocol: "mqtt" as const,
      savedAt: new Date().toISOString(),
      events: createMonitorLogEvents(entries),
    }),
    [entries],
  );

  const isReplayingLive =
    replayProgress.active && replayProgress.logId === liveLog.id;
  const listEntries = isReplayingLive
    ? debugEntriesToListItems(entries)
    : debugEntriesToListItems(filteredEntries);

  const topicsLabel = formatTopicsLabel(subscribeTopics);

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
    <DebuggerSection title="Monitor" defaultExpanded>
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
          <Tab label="Live" value="live" sx={{ minHeight: 36 }} />
          <Tab label="Saved" value="saved" sx={{ minHeight: 36 }} />
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
                Clear
              </Button>
              <MonitorLogToolbar protocol="mqtt" entries={entries} />
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
                      ? `Waiting for MQTT on ${topicsLabel}…`
                      : "Add a topic to monitor incoming MQTT."
                    : isReplayingLive
                      ? `Waiting for MQTT on ${topicsLabel}…`
                      : isMonitorFilterActive(directionFilter)
                        ? "No messages match the current filter."
                        : `Waiting for MQTT on ${topicsLabel}…`
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
