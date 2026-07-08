import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { ARTNET_DEFAULT_PORT, sendArtNetDmx } from "../lib/artnet";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { NativeOnlyAlert } from "./NativeOnlyAlert";

const CHANNEL_COUNT = 16;

function createDefaultChannels() {
  return Array.from({ length: CHANNEL_COUNT }, () => 0);
}

export function ArtNetComposer() {
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const [host, setHost] = useState("255.255.255.255");
  const [port, setPort] = useState(ARTNET_DEFAULT_PORT);
  const [universe, setUniverse] = useState(0);
  const [sequence, setSequence] = useState(0);
  const [channels, setChannels] = useState(createDefaultChannels);
  const [sending, setSending] = useState(false);

  const updateChannel = (index: number, value: number) => {
    setChannels((current) =>
      current.map((channel, channelIndex) =>
        channelIndex === index ? value : channel,
      ),
    );
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendArtNetDmx(
        host.trim(),
        port,
        universe,
        sequence,
        channels,
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
      <NativeOnlyAlert protocol="Art-Net" />

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Art-Net composer
      </Typography>

      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            label="Host"
            size="small"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            sx={{ width: 180 }}
          />
          <TextField
            label="Port"
            size="small"
            type="number"
            value={port}
            onChange={(event) =>
              setPort(Number(event.target.value) || ARTNET_DEFAULT_PORT)
            }
            sx={{ width: 96 }}
          />
          <TextField
            label="Universe"
            size="small"
            type="number"
            value={universe}
            onChange={(event) =>
              setUniverse(Math.max(0, Number(event.target.value) || 0))
            }
            sx={{ width: 120 }}
          />
          <TextField
            label="Sequence"
            size="small"
            type="number"
            value={sequence}
            onChange={(event) =>
              setSequence(
                Math.min(255, Math.max(0, Number(event.target.value) || 0)),
              )
            }
            sx={{ width: 120 }}
          />
          <Box sx={{ flex: 1 }} />
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 1.5,
          }}
        >
          {channels.map((value, index) => (
            <Stack key={index} spacing={0.5}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 44 }}
                >
                  Ch {index + 1}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  value={value}
                  onChange={(event) =>
                    updateChannel(
                      index,
                      Math.min(
                        255,
                        Math.max(0, Number(event.target.value) || 0),
                      ),
                    )
                  }
                  slotProps={{
                    htmlInput: { min: 0, max: 255 },
                  }}
                  sx={{ width: 72 }}
                />
              </Stack>
              <Slider
                size="small"
                min={0}
                max={255}
                value={value}
                onChange={(_, next) =>
                  updateChannel(index, Array.isArray(next) ? next[0] : next)
                }
              />
            </Stack>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
