import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
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
import { isNativeApp } from "../lib/platform";
import { DebuggerSection } from "./DebuggerSection";
import { debuggerFillSx, debuggerLogSx } from "./debuggerLayoutSx";

const DMX_CHANNEL_COUNT = 512;
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
        {Array.from({ length: DMX_CHANNEL_COUNT }, (_, index) => {
          const value = channels[index] ?? 0;
          return (
            <Box
              key={index}
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
              <span>{index + 1}</span>
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

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const base = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

export function ArtNetMonitor() {
  const { t } = useTranslation();
  const allEntries = useDebugLog();
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

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const payload = getArtNetPayload(entry);
        return payload?.universe === selectedUniverse;
      }),
    [entries, selectedUniverse],
  );

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
  }, [listenPort, listeningEnabled, native]);

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

  return (
    <DebuggerSection title={t("monitor.monitor")} flexGrow>
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
            onClick={() => clearDebugLogFiltered(isArtNetDebugEntry)}
            disabled={!native || entries.length === 0}
          >
            {t("common.clear")}
          </Button>
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
            label={t("common.listen")}
          />
          <TextField
            label={t("common.listenPort")}
            size="small"
            type="number"
            value={listenPort}
            onChange={(event) => setListenPort(Number(event.target.value) || 0)}
            disabled={!native || !listeningEnabled}
            sx={{ maxWidth: 160 }}
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
              {t("monitor.liveChannels")}
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

        <Box sx={debuggerLogSx}>
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              {listenPort > 0
                ? listeningEnabled
                  ? listenerStatus === "listening"
                    ? t("monitor.waitingArtNet", { port: listenPort })
                    : listenerStatus === "starting"
                      ? t("monitor.openingPort", { port: listenPort })
                      : (listenerError ?? t("monitor.listenerNotRunning"))
                  : t("monitor.listenArtNet")
                : t("monitor.setListenPortArtNet")}
            </Typography>
          ) : filteredEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              {t("monitor.noPacketsForUniverse", { universe: selectedUniverse })}
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {filteredEntries.map((entry) => (
                <Stack
                  key={entry.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    rowGap: 0.5,
                    px: { xs: 1.5, sm: 2 },
                    py: 1,
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    minWidth: 0,
                  }}
                >
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontFamily: "inherit", minWidth: { xs: 72, sm: 108 }, flexShrink: 0 }}
                  >
                    {formatTime(entry.timestamp)}
                  </Typography>
                  <Chip
                    label={entry.direction === "in" ? "IN" : "OUT"}
                    size="small"
                    color={entry.direction === "in" ? "info" : "success"}
                    sx={{ minWidth: 48, flexShrink: 0 }}
                  />
                  <Chip
                    label={t("protocols.artnet")}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0 }}
                  />
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      fontFamily: "inherit",
                      flex: "1 1 120px",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.summary}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </DebuggerSection>
  );
}
