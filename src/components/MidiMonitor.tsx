import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearDebugLogFiltered, useDebugLog } from "../lib/debugLog";
import { listMidiInputs, startMidiInput, stopMidiInput } from "../lib/input";
import { listMidiOutputs } from "../lib/output";
import { isMidiDebugKind } from "../lib/midiTypes";
import { createMonitorLogEvents } from "../lib/monitorLog";
import {
  defaultMonitorMidiTypeFilter,
  matchesMidiTypeFilter,
} from "../lib/monitorMidiFilter";
import {
  collectMonitorMidiPorts,
  defaultMonitorMidiPortFilter,
  matchesMidiPortFilter,
} from "../lib/monitorMidiPortFilter";
import {
  defaultMonitorDirectionFilter,
  isMonitorFilterActive,
  matchesDirectionFilter,
} from "../lib/monitorLogFilter";
import { isNativeApp, isWebMidiSupported } from "../lib/platform";
import { useMonitorLogReplayProgress } from "../lib/monitorLogReplay";
import { useAppStore } from "../store/useAppStore";
import { debugEntriesToListItems, MonitorLogList } from "./MonitorLogList";
import { MonitorFilterAccordion } from "./MonitorFilterAccordion";
import { MonitorLogToolbar } from "./MonitorLogToolbar";
import { MonitorReplaySection } from "./MonitorReplaySection";
import { SavedMonitorLogTab } from "./SavedMonitorLogTab";
import { useOpenSavedLogOnReplay } from "./useOpenSavedLogOnReplay";
import { DebuggerSection } from "./DebuggerSection";

type MonitorTab = "live" | "saved";

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

  const [tab, setTab] = useState<MonitorTab>("live");
  useOpenSavedLogOnReplay("midi", setTab);
  const [inputPort, setInputPort] = useState(output.midiInputPortName ?? "");
  const [directionFilter, setDirectionFilter] = useState(defaultMonitorDirectionFilter);
  const [midiTypeFilter, setMidiTypeFilter] = useState(defaultMonitorMidiTypeFilter);
  const [midiPortFilter, setMidiPortFilter] = useState(defaultMonitorMidiPortFilter);

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

  const isReplayingLive =
    replayProgress.active && replayProgress.logId === liveLog.id;
  const listEntries = isReplayingLive
    ? debugEntriesToListItems(entries)
    : debugEntriesToListItems(filteredEntries);

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
      <Stack
        spacing={2}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!isNativeApp() && !isWebMidiSupported() && (
          <Alert severity="warning">
            {t("monitor.webMidiUnsupported")}
          </Alert>
        )}

        <Tabs
          value={tab}
          onChange={(_, value: MonitorTab) => setTab(value)}
          sx={{
            flexShrink: 0,
            minHeight: 36,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label={t("common.live")} value="live" sx={{ minHeight: 36 }} />
          <Tab label={t("common.saved")} value="saved" sx={{ minHeight: 36 }} />
        </Tabs>

        {tab === "live" ? (
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
                onClick={() =>
                  clearDebugLogFiltered((entry) => isMidiDebugKind(entry.kind))
                }
                disabled={entries.length === 0}
              >
                {t("common.clear")}
              </Button>
              <MonitorLogToolbar protocol="midi" entries={entries} />
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

              <MonitorReplaySection log={liveLog} incomingCount={incomingCount} />
            </Stack>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
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
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <SavedMonitorLogTab protocol="midi" />
          </Box>
        )}
      </Stack>
    </DebuggerSection>
  );
}
