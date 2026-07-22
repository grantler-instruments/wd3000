import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Stack, Tab, Tabs, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearDebugLogFiltered,
  isOscDebugEntry,
  removeDebugLogEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startOscListener, stopOscListener } from "../lib/input";
import { createMonitorLogEvents } from "../lib/monitorLog";
import { isMonitorFilterActive, matchesDirectionFilter } from "../lib/monitorLogFilter";
import {
  clearReplaySession,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
  useReplaySession,
} from "../lib/monitorLogReplay";
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
import { SavedMonitorLogTab } from "./SavedMonitorLogTab";
import { useMonitorTabs } from "./useMonitorTabs";

export function OscMonitor() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const replaySession = useReplaySession();
  const { tab, setTab, logs } = useMonitorTabs("osc");
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const { directionFilter, setDirectionFilter } = useMonitorFilters("osc");
  const native = isNativeApp();

  const [listenPort, setListenPort] = useState(output.oscListenPort);

  const entries = useMemo(() => allEntries.filter(isOscDebugEntry), [allEntries]);

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
      protocol: "osc" as const,
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
  const hasOscReplay = replaySession.protocol === "osc";
  const tabValue =
    tab === "replay" && !hasOscReplay
      ? "live"
      : tab !== "live" && tab !== "replay" && !logs.some((log) => log.id === tab)
        ? "live"
        : tab;

  useEffect(() => {
    if (replayProgress.active && hasOscReplay) {
      setTab("replay");
    }
  }, [hasOscReplay, replayProgress.active, setTab]);

  useEffect(() => {
    setListenPort(output.oscListenPort);
  }, [output.oscListenPort]);

  useEffect(() => {
    if (!native) {
      return;
    }

    let cancelled = false;

    void startOscListener(listenPort > 0 ? listenPort : null).catch((error) => {
      if (!cancelled) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      cancelled = true;
      void stopOscListener();
    };
  }, [listenPort, native, setLastError]);

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
          {(hasOscReplay || tab === "replay") && (
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
                onClick={() => clearDebugLogFiltered(isOscDebugEntry)}
                disabled={!native || entries.length === 0}
              >
                {t("common.clear")}
              </Button>
              <MonitorLogToolbar
                protocol="osc"
                entries={entries}
                onSaved={setTab}
                onImported={setTab}
              />
            </Stack>

            <TextField
              label={t("common.listenPort")}
              size="small"
              type="number"
              value={listenPort}
              onChange={(event) => {
                const nextPort = Number(event.target.value) || 0;
                setListenPort(nextPort);
                setOutput({ oscListenPort: nextPort });
              }}
              helperText={t("monitor.setListenPortZero")}
              disabled={!native}
              sx={{ maxWidth: 200, flexShrink: 0 }}
              slotProps={{
                formHelperText: { sx: { mx: 0 } },
              }}
            />

            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              <MonitorFilterAccordion
                protocol="osc"
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
                    ? listenPort > 0
                      ? t("monitor.waitingOsc", { port: listenPort })
                      : t("monitor.setListenPortOsc")
                    : isReplayingLive
                      ? t("monitor.waitingOsc", { port: listenPort })
                      : isMonitorFilterActive(directionFilter)
                        ? t("monitor.noFilterMatch")
                        : t("monitor.waitingOsc", { port: listenPort })
                }
              />
            </Box>
          </Stack>
        ) : tabValue === "replay" ? (
          <MonitorReplayTabPanel
            entries={replayEntries}
            emptyMessage={t("monitor.waitingOsc", { port: listenPort })}
          />
        ) : (
          <Box sx={debuggerLogSx}>
            <SavedMonitorLogTab
              protocol="osc"
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
