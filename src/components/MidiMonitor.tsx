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
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { clearDebugLogFiltered, useDebugLog } from "../lib/debugLog";
import { listMidiInputs, startMidiInput, stopMidiInput } from "../lib/input";
import { isMidiDebugKind } from "../lib/midiTypes";
import { createMonitorLogEvents } from "../lib/monitorLog";
import {
  defaultMonitorMidiTypeFilter,
  matchesMidiTypeFilter,
} from "../lib/monitorMidiFilter";
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

type MonitorTab = "live" | "saved";

export function MidiMonitor() {
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const midiInputPorts = useAppStore((state) => state.midiInputPorts);
  const setMidiInputPorts = useAppStore((state) => state.setMidiInputPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();

  const [tab, setTab] = useState<MonitorTab>("live");
  useOpenSavedLogOnReplay("midi", setTab);
  const [inputPort, setInputPort] = useState(output.midiInputPortName ?? "");
  const [directionFilter, setDirectionFilter] = useState(defaultMonitorDirectionFilter);
  const [midiTypeFilter, setMidiTypeFilter] = useState(defaultMonitorMidiTypeFilter);

  const entries = useMemo(
    () => allEntries.filter((entry) => isMidiDebugKind(entry.kind)),
    [allEntries],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          matchesDirectionFilter(entry.direction, directionFilter) &&
          matchesMidiTypeFilter(entry.kind, midiTypeFilter),
      ),
    [directionFilter, entries, midiTypeFilter],
  );

  const incomingCount = useMemo(
    () => entries.filter((entry) => entry.direction === "in").length,
    [entries],
  );

  const liveLog = useMemo(
    () => ({
      id: "live-monitor",
      name: "Live monitor",
      protocol: "midi" as const,
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

  useEffect(() => {
    listMidiInputs()
      .then((inputs) => {
        setMidiInputPorts(inputs);
        setInputPort((current) => current || output.midiInputPortName || "");
      })
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  }, [output.midiInputPortName, setLastError, setMidiInputPorts]);

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
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {!isNativeApp() && !isWebMidiSupported() && (
        <Alert severity="warning">
          Web MIDI is not supported in this browser.
        </Alert>
      )}

      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}
      >
        <Box>
          <Typography variant="h6">MIDI monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Listen to incoming MIDI. Enable OUT to also see messages sent by WD3000.
          </Typography>
        </Box>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value: MonitorTab) => setTab(value)}
        sx={{ minHeight: 36, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Live" value="live" sx={{ minHeight: 36 }} />
        <Tab label="Saved" value="saved" sx={{ minHeight: 36 }} />
      </Tabs>

      {tab === "live" ? (
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "flex-start", justifyContent: "flex-end", flexWrap: "wrap" }}
          >
            <Button
              size="small"
              onClick={() =>
                clearDebugLogFiltered((entry) => isMidiDebugKind(entry.kind))
              }
              disabled={entries.length === 0}
            >
              Clear
            </Button>
            <MonitorLogToolbar protocol="midi" entries={entries} />
          </Stack>

          {midiInputPorts.length === 0 ? (
            <Alert severity="info">No MIDI input ports found.</Alert>
          ) : (
            <FormControl fullWidth size="small" sx={{ maxWidth: 480 }}>
              <InputLabel id="midi-monitor-port-label">Input port</InputLabel>
              <Select
                labelId="midi-monitor-port-label"
                label="Input port"
                value={inputPort}
                onChange={(event) => {
                  const nextPort = event.target.value;
                  setInputPort(nextPort);
                  setOutput({ midiInputPortName: nextPort || null });
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {midiInputPorts.map((port) => (
                  <MenuItem key={port} value={port}>
                    {port}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <MonitorFilterAccordion
            protocol="midi"
            directionFilter={directionFilter}
            onDirectionFilterChange={setDirectionFilter}
            midiTypeFilter={midiTypeFilter}
            onMidiTypeFilterChange={setMidiTypeFilter}
          />

          <MonitorReplaySection log={liveLog} incomingCount={incomingCount} />

          <Box
            sx={{
              flex: 1,
              minHeight: 200,
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
                    ? "Waiting for MIDI messages…"
                    : "Select an input port to monitor incoming MIDI."
                  : isReplayingLive
                    ? "Waiting for MIDI messages…"
                  : isMonitorFilterActive(directionFilter, midiTypeFilter)
                    ? "No messages match the current filter."
                    : "Waiting for MIDI messages…"
              }
            />
          </Box>
        </Stack>
      ) : (
        <SavedMonitorLogTab protocol="midi" />
      )}
    </Stack>
  );
}
