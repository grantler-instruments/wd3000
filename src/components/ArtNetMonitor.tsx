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
import { ARTNET_DEFAULT_PORT } from "../lib/artnet";
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
  const [channels, setChannels] = useState(createEmptyChannels);

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

  const latestEntry = entries[0];

  useEffect(() => {
    if (entries.length === 0) {
      setChannels(createEmptyChannels());
      return;
    }

    if (!latestEntry?.payload || latestEntry.kind !== "artnet") {
      return;
    }

    const payload = latestEntry.payload as ArtNetMonitorPayload;
    setChannels((current) => {
      const next = new Uint8Array(current);
      const count = Math.min(payload.channels.length, DMX_CHANNEL_COUNT);
      for (let index = 0; index < count; index += 1) {
        next[index] = payload.channels[index] ?? 0;
      }
      return next;
    });
  }, [entries.length, latestEntry?.id, latestEntry?.payload, latestEntry?.kind]);

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
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Live channels
          {latestEntry?.payload && latestEntry.kind === "artnet"
            ? ` · universe ${(latestEntry.payload as ArtNetMonitorPayload).universe}`
            : ""}
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
        ) : (
          <Stack divider={<Divider />}>
            {entries.map((entry) => (
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
