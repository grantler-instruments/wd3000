import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  ARTNET_DEFAULT_PORT,
  ARTNET_MAX_CHANNEL,
  ARTNET_MAX_UNIVERSE,
  ARTNET_MAX_VALUE,
  ARTNET_MIN_CHANNEL,
  ARTNET_MIN_UNIVERSE,
  ARTNET_MIN_VALUE,
  buildArtNetChannels,
  defaultArtNetComposerParams,
  formatArtNetComposerSummary,
  sendArtNetDmx,
} from "../lib/artnet";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function useNumberField(
  value: number,
  onChange: (value: number) => void,
  min: number,
  max: number,
) {
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    setInput(raw);
    if (raw === "" || raw === "-") {
      return;
    }
    const num = Number.parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      onChange(clamp(num, min, max));
    }
  };

  const handleBlur = () => {
    const num = Number.parseInt(input, 10);
    const clamped = Number.isNaN(num) ? min : clamp(num, min, max);
    onChange(clamped);
    setInput(String(clamped));
  };

  return { input, handleChange, handleBlur };
}

export function ArtNetComposer() {
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const [host, setHost] = useState("255.255.255.255");
  const [port, setPort] = useState(ARTNET_DEFAULT_PORT);
  const [sequence, setSequence] = useState(0);
  const [params, setParams] = useState(defaultArtNetComposerParams);
  const [sending, setSending] = useState(false);

  const universeField = useNumberField(
    params.universe,
    (value) => setParams((current) => ({ ...current, universe: value })),
    ARTNET_MIN_UNIVERSE,
    ARTNET_MAX_UNIVERSE,
  );
  const channelField = useNumberField(
    params.channel,
    (value) => setParams((current) => ({ ...current, channel: value })),
    ARTNET_MIN_CHANNEL,
    ARTNET_MAX_CHANNEL,
  );
  const valueField = useNumberField(
    params.value,
    (value) => setParams((current) => ({ ...current, value: value })),
    ARTNET_MIN_VALUE,
    ARTNET_MAX_VALUE,
  );
  const portField = useNumberField(
    port,
    setPort,
    1,
    65535,
  );

  const handleSend = async () => {
    if (!host.trim()) {
      setLastError("Enter an Art-Net host");
      return;
    }

    setSending(true);

    try {
      const channels = buildArtNetChannels(params.channel, params.value);
      const summary = formatArtNetComposerSummary(params, sequence);
      await sendArtNetDmx(
        host.trim(),
        port,
        params.universe,
        sequence,
        channels,
        summary,
      );
      setSequence((current) => (current + 1) % 256);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          label="Universe"
          value={universeField.input}
          onChange={(event) => universeField.handleChange(event.target.value)}
          onBlur={universeField.handleBlur}
          inputMode="numeric"
          size="small"
          sx={{ width: 104 }}
        />

        <TextField
          label="Channel"
          value={channelField.input}
          onChange={(event) => channelField.handleChange(event.target.value)}
          onBlur={channelField.handleBlur}
          inputMode="numeric"
          size="small"
          sx={{ width: 104 }}
        />

        <TextField
          label="Value"
          value={valueField.input}
          onChange={(event) => valueField.handleChange(event.target.value)}
          onBlur={valueField.handleBlur}
          inputMode="numeric"
          size="small"
          sx={{ width: 104 }}
        />

        <Box sx={{ flex: 1 }} />

        <TextField
          label="Host"
          size="small"
          value={host}
          onChange={(event) => setHost(event.target.value)}
          sx={{ minWidth: 180, maxWidth: 240 }}
        />

        <TextField
          label="Port"
          value={portField.input}
          onChange={(event) => portField.handleChange(event.target.value)}
          onBlur={portField.handleBlur}
          inputMode="numeric"
          size="small"
          sx={{ width: 96 }}
        />

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleSend}
          disabled={!native || sending || !host.trim()}
          sx={{ flexShrink: 0 }}
        >
          Send
        </Button>
      </Stack>
    </Box>
  );
}
