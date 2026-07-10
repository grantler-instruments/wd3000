import {
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  clearDebugLogFiltered,
  isOscDebugEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startOscListener, stopOscListener } from "../lib/input";
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
import { NativeOnlyAlert } from "./NativeOnlyAlert";
import { SavedMonitorLogTab } from "./SavedMonitorLogTab";
import { useOpenSavedLogOnReplay } from "./useOpenSavedLogOnReplay";

type MonitorTab = "live" | "saved";

export function OscMonitor() {
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const native = isNativeApp();

  const [tab, setTab] = useState<MonitorTab>("live");
  useOpenSavedLogOnReplay("osc", setTab);
  const [listenPort, setListenPort] = useState(output.oscListenPort);
  const [directionFilter, setDirectionFilter] = useState(defaultMonitorDirectionFilter);

  const entries = useMemo(
    () => allEntries.filter(isOscDebugEntry),
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
      protocol: "osc" as const,
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
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <NativeOnlyAlert protocol="OSC" />

      <Box>
        <Typography variant="body2" color="text.secondary">
          Listen to incoming OSC. Enable OUT to also see messages sent by WD3000.
        </Typography>
      </Box>

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
              onClick={() => clearDebugLogFiltered(isOscDebugEntry)}
              disabled={!native || entries.length === 0}
            >
              Clear
            </Button>
            <MonitorLogToolbar protocol="osc" entries={entries} />
          </Stack>

          <TextField
            label="Listen port"
            size="small"
            type="number"
            value={listenPort}
            onChange={(event) => {
              const nextPort = Number(event.target.value) || 0;
              setListenPort(nextPort);
              setOutput({ oscListenPort: nextPort });
            }}
            helperText="Set to 0 to disable listening."
            disabled={!native}
            sx={{ maxWidth: 200 }}
            slotProps={{
              formHelperText: { sx: { mx: 0 } },
            }}
          />

          <MonitorFilterAccordion
            protocol="osc"
            directionFilter={directionFilter}
            onDirectionFilterChange={setDirectionFilter}
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
                  ? listenPort > 0
                    ? `Waiting for OSC on port ${listenPort}…`
                    : "Set a listen port to monitor incoming OSC."
                  : isReplayingLive
                    ? `Waiting for OSC on port ${listenPort}…`
                  : isMonitorFilterActive(directionFilter)
                    ? "No messages match the current filter."
                    : `Waiting for OSC on port ${listenPort}…`
              }
            />
          </Box>
        </Stack>
      ) : (
        <SavedMonitorLogTab protocol="osc" />
      )}
    </Stack>
  );
}
