import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearDebugLogFiltered, removeDebugLogEntry, useDebugLog } from "../lib/debugLog";
import { listMidiInputs, startMidiInput, stopMidiInput } from "../lib/input";
import { isMidiDebugKind } from "../lib/midiTypes";
import { createMonitorLogEvents } from "../lib/monitorLog";
import { isMonitorFilterActive, matchesDirectionFilter } from "../lib/monitorLogFilter";
import {
  clearReplaySession,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
  useReplaySession,
} from "../lib/monitorLogReplay";
import { matchesMidiTypeFilter } from "../lib/monitorMidiFilter";
import { collectMonitorMidiPorts, matchesMidiPortFilter } from "../lib/monitorMidiPortFilter";
import { listMidiOutputs } from "../lib/output";
import { isNativeApp, isWebMidiSupported } from "../lib/platform";
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

export function MidiMonitor() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const midiInputPorts = useAppStore((state) => state.midiInputPorts);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiInputPorts = useAppStore((state) => state.setMidiInputPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const replaySession = useReplaySession();
  const { tab, setTab, logs } = useMonitorTabs("midi");
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const {
    directionFilter,
    setDirectionFilter,
    midiTypeFilter,
    setMidiTypeFilter,
    midiPortFilter,
    setMidiPortFilter,
  } = useMonitorFilters("midi");

  const [inputPort, setInputPort] = useState(output.midiInputPortName ?? "");

  const entries = useMemo(
    () => allEntries.filter((entry) => isMidiDebugKind(entry.kind)),
    [allEntries],
  );

  const availablePorts = useMemo(
    () => collectMonitorMidiPorts(entries, midiInputPorts, midiPorts),
    [entries, midiInputPorts, midiPorts],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          matchesDirectionFilter(entry.direction, directionFilter) &&
          matchesMidiTypeFilter(entry.kind, midiTypeFilter) &&
          matchesMidiPortFilter(entry.portName, midiPortFilter),
      ),
    [directionFilter, entries, midiPortFilter, midiTypeFilter],
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
      protocol: "midi" as const,
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
  const hasMidiReplay = replaySession.protocol === "midi";
  const tabValue =
    tab === "replay" && !hasMidiReplay
      ? "live"
      : tab !== "live" && tab !== "replay" && !logs.some((log) => log.id === tab)
        ? "live"
        : tab;

  useEffect(() => {
    if (replayProgress.active && hasMidiReplay) {
      setTab("replay");
    }
  }, [hasMidiReplay, replayProgress.active, setTab]);

  useEffect(() => {
    listMidiInputs()
      .then((inputs) => {
        setMidiInputPorts(inputs);
        setInputPort((current) => current || output.midiInputPortName || "");
      })
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });

    listMidiOutputs()
      .then(setMidiPorts)
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  }, [output.midiInputPortName, setLastError, setMidiInputPorts, setMidiPorts]);

  useEffect(() => {
    let cancelled = false;

    void startMidiInput(inputPort || null).catch((error) => {
      if (!cancelled) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      cancelled = true;
      void stopMidiInput();
    };
  }, [inputPort, setLastError]);

  return (
    <DebuggerSection title={t("monitor.monitor")} flexGrow>
      <Stack spacing={2} sx={debuggerFillSx}>
        {!isNativeApp() && !isWebMidiSupported() && (
          <Alert severity="warning">{t("monitor.webMidiUnsupported")}</Alert>
        )}

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
          {(hasMidiReplay || tab === "replay") && (
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
                onClick={() => clearDebugLogFiltered((entry) => isMidiDebugKind(entry.kind))}
                disabled={entries.length === 0}
              >
                {t("common.clear")}
              </Button>
              <MonitorLogToolbar
                protocol="midi"
                entries={entries}
                onSaved={setTab}
                onImported={setTab}
              />
            </Stack>

            {midiInputPorts.length === 0 ? (
              <Alert severity="info">{t("monitor.noMidiInputs")}</Alert>
            ) : (
              <FormControl fullWidth size="small" sx={{ maxWidth: 480, flexShrink: 0 }}>
                <InputLabel id="midi-monitor-port-label">{t("monitor.inputPort")}</InputLabel>
                <Select
                  labelId="midi-monitor-port-label"
                  label={t("monitor.inputPort")}
                  value={inputPort}
                  onChange={(event) => {
                    const nextPort = event.target.value;
                    setInputPort(nextPort);
                    setOutput({ midiInputPortName: nextPort || null });
                  }}
                >
                  <MenuItem value="">
                    <em>{t("common.none")}</em>
                  </MenuItem>
                  {midiInputPorts.map((port) => (
                    <MenuItem key={port} value={port}>
                      {port}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              <MonitorFilterAccordion
                protocol="midi"
                directionFilter={directionFilter}
                onDirectionFilterChange={setDirectionFilter}
                midiTypeFilter={midiTypeFilter}
                onMidiTypeFilterChange={setMidiTypeFilter}
                midiPortFilter={midiPortFilter}
                onMidiPortFilterChange={setMidiPortFilter}
                midiPorts={availablePorts}
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
                    ? inputPort
                      ? t("monitor.waitingMidi")
                      : t("monitor.selectMidiInput")
                    : isReplayingLive
                      ? t("monitor.waitingMidi")
                      : isMonitorFilterActive(directionFilter, midiTypeFilter, midiPortFilter)
                        ? t("monitor.noFilterMatch")
                        : t("monitor.waitingMidi")
                }
              />
            </Box>
          </Stack>
        ) : tabValue === "replay" ? (
          <MonitorReplayTabPanel entries={replayEntries} emptyMessage={t("monitor.waitingMidi")} />
        ) : (
          <Box sx={debuggerLogSx}>
            <SavedMonitorLogTab
              protocol="midi"
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
