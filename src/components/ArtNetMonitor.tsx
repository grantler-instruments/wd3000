import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { ARTNET_DEFAULT_PORT } from "../lib/artnet";
import {
  clearDebugLogFiltered,
  isArtNetDebugEntry,
  useDebugLog,
} from "../lib/debugLog";
import { startArtNetListener, stopArtNetListener } from "../lib/input";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { NativeOnlyAlert } from "./NativeOnlyAlert";

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
  const setLastError = useAppStore((state) => state.setLastError);
  const allEntries = useDebugLog();
  const native = isNativeApp();

  const [listenPort, setListenPort] = useState(ARTNET_DEFAULT_PORT);

  const entries = useMemo(
    () => allEntries.filter(isArtNetDebugEntry),
    [allEntries],
  );

  useEffect(() => {
    if (!native) {
      return;
    }

    let cancelled = false;

    void startArtNetListener(listenPort > 0 ? listenPort : null).catch(
      (error) => {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      },
    );

    return () => {
      cancelled = true;
      void stopArtNetListener();
    };
  }, [listenPort, native, setLastError]);

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

      <TextField
        label="Listen port"
        size="small"
        type="number"
        value={listenPort}
        onChange={(event) => setListenPort(Number(event.target.value) || 0)}
        helperText="Set to 0 to disable listening."
        disabled={!native}
        sx={{ maxWidth: 200 }}
        slotProps={{
          formHelperText: { sx: { mx: 0 } },
        }}
      />

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
              ? `Waiting for Art-Net on port ${listenPort}…`
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
