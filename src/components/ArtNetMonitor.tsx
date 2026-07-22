import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ARTNET_DEFAULT_PORT, ARTNET_MAX_UNIVERSE, ARTNET_MIN_UNIVERSE } from "../lib/artnet";
import {
  type ArtNetMonitorPayload,
  clearDebugLogFiltered,
  type DebugLogEntry,
  isArtNetDebugEntry,
  useDebugLog,
} from "../lib/debugLog";
import { getArtNetListenerStatus, startArtNetListener, stopArtNetListener } from "../lib/input";
import { createMonitorLogEvents } from "../lib/monitorLog";
import { isMonitorFilterActive, matchesDirectionFilter } from "../lib/monitorLogFilter";
import {
  clearReplaySession,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
  useReplaySession,
} from "../lib/monitorLogReplay";
import { isNativeApp } from "../lib/platform";
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

const DMX_CHANNEL_COUNT = 512;
const DMX_CHANNELS = Array.from({ length: DMX_CHANNEL_COUNT }, (_, channel) => channel);
const GRID_COLUMNS = 32;
const GRID_CELL_MIN = 28;

type ListenerStatus = "stopped" | "starting" | "listening" | "error";

function createEmptyChannels() {
  return new Uint8Array(DMX_CHANNEL_COUNT);
}

function ArtNetChannelGrid({ channels }: { channels: Uint8Array }) {
  return (
    <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(${GRID_CELL_MIN}px, 1fr))`,
          gap: "1px",
          bgcolor: "divider",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          minWidth: GRID_COLUMNS * GRID_CELL_MIN,
        }}
      >
        {DMX_CHANNELS.map((channel) => {
          const value = channels[channel] ?? 0;
          return (
            <Box
              key={channel}
              sx={{
                aspectRatio: "1",
                bgcolor: `rgb(${value}, ${value}, ${value})`,
                color: value > 127 ? "common.black" : "common.white",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.5rem",
                lineHeight: 1.1,
                fontFamily: "monospace",
                minWidth: 0,
              }}
            >
              <span>{channel + 1}</span>
              <span>{value}</span>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function getArtNetPayload(entry: DebugLogEntry): ArtNetMonitorPayload | null {
  if (!isArtNetDebugEntry(entry) || !entry.payload || !("universe" in entry.payload)) {
    return null;
  }
  return entry.payload;
}

function buildChannelsByUniverse(entries: ReturnType<typeof useDebugLog>) {
  const map = new Map<number, Uint8Array>();

  for (const entry of [...entries].reverse()) {
    const payload = getArtNetPayload(entry);
    if (!payload) {
      continue;
    }

    const current = map.get(payload.universe) ?? createEmptyChannels();
    const next = new Uint8Array(current);
    const count = Math.min(payload.channels.length, DMX_CHANNEL_COUNT);
    for (let index = 0; index < count; index += 1) {
      next[index] = payload.channels[index] ?? 0;
    }
    map.set(payload.universe, next);
  }

  return map;
}

export function ArtNetMonitor() {
  const { t } = useTranslation();
  const allEntries = useDebugLog();
  const replayProgress = useMonitorLogReplayProgress();
  const replaySession = useReplaySession();
  const { tab, setTab, logs } = useMonitorTabs("artnet");
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const { directionFilter, setDirectionFilter } = useMonitorFilters("artnet");
  const native = isNativeApp();

  const [listenPort, setListenPort] = useState(ARTNET_DEFAULT_PORT);
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus>("stopped");
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState(0);

  const refreshListenerStatus = useCallback(async () => {
    if (!native) {
      return;
    }

    try {
      const status = await getArtNetListenerStatus();
      if (status.listening && status.port != null) {
        setListenerStatus("listening");
        setListenerError(null);
        setListenPort(status.port);
        setListeningEnabled(true);
      } else if (!listeningEnabled) {
        setListenerStatus("stopped");
      }
    } catch {
      // Ignore status polling errors.
    }
  }, [listeningEnabled, native]);

  const entries = useMemo(() => allEntries.filter(isArtNetDebugEntry), [allEntries]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesDirectionFilter(entry.direction, directionFilter)),
    [directionFilter, entries],
  );

  const discoveredUniverses = useMemo(() => {
    const universes = new Set<number>();
    for (const entry of entries) {
      const payload = getArtNetPayload(entry);
      if (payload) {
        universes.add(payload.universe);
      }
    }
    return Array.from(universes).sort((left, right) => left - right);
  }, [entries]);

  const channelsByUniverse = useMemo(() => buildChannelsByUniverse(entries), [entries]);
  const channels = channelsByUniverse.get(selectedUniverse) ?? createEmptyChannels();

  const universeEntries = useMemo(
    () =>
      filteredEntries.filter((entry) => {
        const payload = getArtNetPayload(entry);
        return payload?.universe === selectedUniverse;
      }),
    [filteredEntries, selectedUniverse],
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
      protocol: "artnet" as const,
      savedAt: new Date().toISOString(),
      events: createMonitorLogEvents(entries),
    }),
    [entries, t],
  );

  const isReplayingLive = replayProgress.active && replayProgress.logId === liveLog.id;
  const listEntries = isReplayingLive
    ? debugEntriesToListItems(
        entries.filter((entry) => getArtNetPayload(entry)?.universe === selectedUniverse),
      )
    : debugEntriesToListItems(universeEntries);
  const replayEntries = useMemo(
    () => debugEntriesToListItems(replaySession.entries),
    [replaySession.entries],
  );
  const hasArtNetReplay = replaySession.protocol === "artnet";
  const tabValue =
    tab === "replay" && !hasArtNetReplay
      ? "live"
      : tab !== "live" && tab !== "replay" && !logs.some((log) => log.id === tab)
        ? "live"
        : tab;

  useEffect(() => {
    if (replayProgress.active && hasArtNetReplay) {
      setTab("replay");
    }
  }, [hasArtNetReplay, replayProgress.active, setTab]);

  useEffect(() => {
    void refreshListenerStatus();
  }, [refreshListenerStatus]);

  useEffect(() => {
    if (!native) {
      return;
    }

    if (!listeningEnabled) {
      setListenerStatus("stopped");
      setListenerError(null);
      void stopArtNetListener();
      return;
    }

    if (listenPort <= 0) {
      setListenerStatus("error");
      setListenerError(t("monitor.enterValidListenPort"));
      void stopArtNetListener();
      return;
    }

    let cancelled = false;
    setListenerStatus("starting");
    setListenerError(null);

    void startArtNetListener(listenPort)
      .then(() => getArtNetListenerStatus())
      .then((status) => {
        if (cancelled) {
          return;
        }

        if (status.listening) {
          setListenerStatus("listening");
          setListenerError(null);
          return;
        }

        setListenerStatus("error");
        setListenerError(t("monitor.listenerDidNotOpen"));
      })
      .catch((error) => {
        if (!cancelled) {
          setListenerStatus("error");
          setListenerError(error instanceof Error ? error.message : String(error));
          setListeningEnabled(false);
        }
      });

    return () => {
      cancelled = true;
      void stopArtNetListener();
    };
  }, [listenPort, listeningEnabled, native, t]);

  const listenerStatusLabel = useMemo(() => {
    switch (listenerStatus) {
      case "starting":
        return t("monitor.openingPort", { port: listenPort });
      case "listening":
        return t("monitor.portOpenListening", { port: listenPort });
      case "error":
        return listenerError ?? t("monitor.failedToOpenPort");
      default:
        return t("monitor.stopped");
    }
  }, [listenPort, listenerError, listenerStatus, t]);

  const listenerStatusColor = useMemo(() => {
    switch (listenerStatus) {
      case "listening":
        return "success" as const;
      case "error":
        return "error" as const;
      case "starting":
        return "info" as const;
      default:
        return "default" as const;
    }
  }, [listenerStatus]);

  const waitingMessage =
    listenPort > 0
      ? listeningEnabled
        ? listenerStatus === "listening"
          ? t("monitor.waitingArtNet", { port: listenPort })
          : listenerStatus === "starting"
            ? t("monitor.openingPort", { port: listenPort })
            : (listenerError ?? t("monitor.listenerNotRunning"))
        : t("monitor.listenArtNet")
      : t("monitor.setListenPortArtNet");

  return (
    <DebuggerSection title={t("monitor.artNetMonitor")} flexGrow>
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
          {(hasArtNetReplay || tab === "replay") && (
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
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                    }}
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
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 480 }}>
                {t("monitor.artNetMonitorHint")}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Button
                  size="small"
                  onClick={() => clearDebugLogFiltered(isArtNetDebugEntry)}
                  disabled={!native || entries.length === 0}
                >
                  {t("common.clear")}
                </Button>
                <MonitorLogToolbar
                  protocol="artnet"
                  entries={entries}
                  onSaved={setTab}
                  onImported={setTab}
                />
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap", flexShrink: 0 }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={listeningEnabled}
                    onChange={(event) => setListeningEnabled(event.target.checked)}
                    disabled={!native || listenerStatus === "starting"}
                  />
                }
                label={t("monitor.listenArtNetLabel")}
              />
              <TextField
                label={t("monitor.artNetListenPort")}
                size="small"
                type="number"
                value={listenPort}
                onChange={(event) => setListenPort(Number(event.target.value) || 0)}
                disabled={!native || !listeningEnabled}
                sx={{ maxWidth: 180 }}
                slotProps={{
                  htmlInput: { min: 1, max: 65535 },
                }}
              />
              <Chip
                label={listenerStatusLabel}
                size="small"
                color={listenerStatusColor}
                variant={listenerStatus === "stopped" ? "outlined" : "filled"}
                sx={{ maxWidth: "100%" }}
              />
            </Stack>

            <Box sx={{ flexShrink: 0 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ alignItems: { xs: "stretch", sm: "center" }, mb: 1, flexWrap: "wrap" }}
              >
                <Typography variant="subtitle2" sx={{ alignSelf: "center" }}>
                  {t("monitor.liveDmxChannels")}
                </Typography>
                <TextField
                  label={t("common.universe")}
                  size="small"
                  type="number"
                  value={selectedUniverse}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isNaN(next)) {
                      setSelectedUniverse(
                        Math.min(ARTNET_MAX_UNIVERSE, Math.max(ARTNET_MIN_UNIVERSE, next)),
                      );
                    }
                  }}
                  slotProps={{
                    htmlInput: { min: ARTNET_MIN_UNIVERSE, max: ARTNET_MAX_UNIVERSE },
                  }}
                  sx={{ width: 120 }}
                />
                {discoveredUniverses.length > 0 && (
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
                    {discoveredUniverses.map((universe) => (
                      <Chip
                        key={universe}
                        label={universe}
                        size="small"
                        color={universe === selectedUniverse ? "primary" : "default"}
                        variant={universe === selectedUniverse ? "filled" : "outlined"}
                        onClick={() => setSelectedUniverse(universe)}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {t("monitor.artNetUniversesHint")}
              </Typography>
              <ArtNetChannelGrid channels={channels} />
            </Box>

            <Stack spacing={1} sx={{ flexShrink: 0 }}>
              <MonitorFilterAccordion
                protocol="artnet"
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
                emptyMessage={
                  entries.length === 0
                    ? waitingMessage
                    : universeEntries.length === 0 && !isReplayingLive
                      ? isMonitorFilterActive(directionFilter)
                        ? t("monitor.noFilterMatch")
                        : t("monitor.noPacketsForUniverse", { universe: selectedUniverse })
                      : waitingMessage
                }
              />
            </Box>
          </Stack>
        ) : tabValue === "replay" ? (
          <MonitorReplayTabPanel entries={replayEntries} emptyMessage={waitingMessage} />
        ) : (
          <Box sx={debuggerLogSx}>
            <SavedMonitorLogTab
              protocol="artnet"
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
