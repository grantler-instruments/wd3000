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
import {
  ARTNET_DEFAULT_PORT,
  ARTNET_MAX_UNIVERSE,
  ARTNET_MIN_UNIVERSE,
} from "../lib/artnet";
import {
  clearDebugLogFiltered,
  isArtNetDebugEntry,
  useDebugLog,
  type ArtNetMonitorPayload,
} from "../lib/debugLog";
import {
  getArtNetListenerStatus,
  startArtNetListener,
  stopArtNetListener,
} from "../lib/input";
import { isNativeApp } from "../lib/platform";
import { NativeOnlyAlert } from "./NativeOnlyAlert";

const DMX_CHANNEL_COUNT = 512;
const GRID_COLUMNS = 32;

type ListenerStatus = "stopped" | "starting" | "listening" | "error";

function createEmptyChannels() {
  return new Uint8Array(DMX_CHANNEL_COUNT);
}

function ArtNetChannelGrid({ channels }: { channels: Uint8Array }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gap: "1px",
        bgcolor: "divider",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
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
  );
}

function getArtNetPayload(entry: { kind: string; payload?: ArtNetMonitorPayload }) {
  if (entry.kind !== "artnet" || !entry.payload) {
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

  const entries = useMemo(
    () => allEntries.filter(isArtNetDebugEntry),
    [allEntries],
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

  const channelsByUniverse = useMemo(
    () => buildChannelsByUniverse(entries),
    [entries],
  );

  const channels =
    channelsByUniverse.get(selectedUniverse) ?? createEmptyChannels();

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
      setListenerError("Enter a valid listen port.");
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
        setListenerError("Listener did not open the port.");
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
        return `Opening port ${listenPort}…`;
      case "listening":
        return `Port open · listening on ${listenPort}`;
      case "error":
        return listenerError ?? "Failed to open port";
      default:
        return "Stopped";
    }
  }, [listenPort, listenerError, listenerStatus]);

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
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <NativeOnlyAlert protocol="Art-Net" />

      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}
      >
        <Box>
          <Typography variant="h6">Art-Net monitor</Typography>
          <Typography variant="body2" color="text.secondary">
            Incoming and outgoing ArtDMX packets.
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => clearDebugLogFiltered(isArtNetDebugEntry)}
          disabled={!native || entries.length === 0}
        >
          Clear
        </Button>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={listeningEnabled}
              onChange={(event) => setListeningEnabled(event.target.checked)}
              disabled={!native || listenerStatus === "starting"}
            />
          }
          label="Listen"
        />
        <TextField
          label="Listen port"
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

      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, mb: 1, flexWrap: "wrap" }}
        >
          <Typography variant="subtitle2" sx={{ alignSelf: "center" }}>
            Live channels
          </Typography>
          <TextField
            label="Universe"
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
          Art-Net supports 32,768 universes (0–32767), 512 channels each.
        </Typography>
        <ArtNetChannelGrid channels={channels} />
      </Box>

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
        {entries.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            {listenPort > 0
              ? listeningEnabled
                ? listenerStatus === "listening"
                  ? `Waiting for Art-Net on port ${listenPort}…`
                  : listenerStatus === "starting"
                    ? `Opening port ${listenPort}…`
                    : listenerError ?? "Listener is not running."
                : "Enable Listen to monitor incoming Art-Net."
              : "Set a listen port to monitor incoming Art-Net."}
          </Typography>
        ) : filteredEntries.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No packets for universe {selectedUniverse} yet.
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
                  px: 2,
                  py: 1,
                  fontFamily: "monospace",
                  fontSize: "0.8125rem",
                }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFamily: "inherit", minWidth: 108 }}
                >
                  {formatTime(entry.timestamp)}
                </Typography>
                <Chip
                  label={entry.direction === "in" ? "IN" : "OUT"}
                  size="small"
                  color={entry.direction === "in" ? "info" : "success"}
                  sx={{ minWidth: 48 }}
                />
                <Chip label="Art-Net" size="small" variant="outlined" />
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ fontFamily: "inherit", flex: 1 }}
                >
                  {entry.summary}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
