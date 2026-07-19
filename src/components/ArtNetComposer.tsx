import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  clampDeemexMidiStartChannel,
  DEEMEX_URL,
  DEFAULT_DEEMEX_MIDI_START_CHANNEL,
  deemexMaxDmxChannels,
  formatDeemexComposerSummary,
} from "../lib/deemex-midi";
import {
  canUseEnttecPro,
  connectEnttecProTauri,
  connectEnttecProWeb,
  type DmxTransport,
  disconnectEnttecPro,
  disconnectEnttecProWeb,
  ENTTEC_PRO_MAX_UNIVERSE,
  ENTTEC_PRO_MIN_UNIVERSE,
  formatEnttecComposerSummary,
  isEnttecProConnectedWeb,
  isWebSerialAvailable,
  listSerialPorts,
  type SerialPortOption,
  sendEnttecProDmx,
} from "../lib/enttec-pro";
import { listMidiOutputs } from "../lib/output";
import { getAppPlatform, isNativeApp, isWebMidiSupported } from "../lib/platform";
import { canUseDeemex, sendDeemexDmx } from "../lib/send-deemex-dmx";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";
import { debuggerComposerRowSx } from "./debuggerLayoutSx";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

function defaultTransport(
  native: boolean,
  enttecAvailable: boolean,
  deemexAvailable: boolean,
): DmxTransport {
  if (native) return "artnet";
  if (enttecAvailable) return "enttec";
  if (deemexAvailable) return "deemex";
  return "artnet";
}

export function ArtNetComposer() {
  const { t } = useTranslation();
  const setLastError = useAppStore((state) => state.setLastError);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const native = isNativeApp();
  const desktopNative = native && getAppPlatform() === "desktop";
  const enttecAvailable = canUseEnttecPro();
  const deemexAvailable = canUseDeemex();
  const webSerial = !native && isWebSerialAvailable();
  const showTransportSelect = native || enttecAvailable || deemexAvailable;

  const [transport, setTransport] = useState<DmxTransport>(() =>
    defaultTransport(native, enttecAvailable, deemexAvailable),
  );
  const [host, setHost] = useState("255.255.255.255");
  const [port, setPort] = useState(ARTNET_DEFAULT_PORT);
  const [sequence, setSequence] = useState(0);
  const [params, setParams] = useState(defaultArtNetComposerParams);
  const [sending, setSending] = useState(false);
  const [serialPorts, setSerialPorts] = useState<SerialPortOption[]>([]);
  const [serialPortId, setSerialPortId] = useState("");
  const [enttecConnected, setEnttecConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deemexPortName, setDeemexPortName] = useState("");
  const [deemexStartChannel, setDeemexStartChannel] = useState(DEFAULT_DEEMEX_MIDI_START_CHANNEL);

  const useEnttec = transport === "enttec";
  const useDeemex = transport === "deemex";

  const deemexChannelMax = useMemo(
    () => deemexMaxDmxChannels(deemexStartChannel),
    [deemexStartChannel],
  );

  const universeMin = useEnttec ? ENTTEC_PRO_MIN_UNIVERSE : useDeemex ? 1 : ARTNET_MIN_UNIVERSE;
  const universeMax = useEnttec ? ENTTEC_PRO_MAX_UNIVERSE : useDeemex ? 1 : ARTNET_MAX_UNIVERSE;
  const channelMax = useDeemex ? deemexChannelMax : ARTNET_MAX_CHANNEL;

  const universeField = useNumberField(
    params.universe,
    (value) => setParams((current) => ({ ...current, universe: value })),
    universeMin,
    universeMax,
  );
  const channelField = useNumberField(
    params.channel,
    (value) => setParams((current) => ({ ...current, channel: value })),
    ARTNET_MIN_CHANNEL,
    channelMax,
  );
  const valueField = useNumberField(
    params.value,
    (value) => setParams((current) => ({ ...current, value: value })),
    ARTNET_MIN_VALUE,
    ARTNET_MAX_VALUE,
  );
  const portField = useNumberField(port, setPort, 1, 65535);
  const deemexStartField = useNumberField(
    deemexStartChannel,
    (value) => setDeemexStartChannel(clampDeemexMidiStartChannel(value)),
    1,
    16,
  );

  useEffect(() => {
    if (useEnttec) {
      setParams((current) => ({
        ...current,
        universe: clamp(current.universe, ENTTEC_PRO_MIN_UNIVERSE, ENTTEC_PRO_MAX_UNIVERSE),
      }));
      return;
    }
    if (useDeemex) {
      setParams((current) => ({
        ...current,
        universe: 1,
        channel: clamp(current.channel, ARTNET_MIN_CHANNEL, deemexChannelMax),
      }));
    }
  }, [useEnttec, useDeemex, deemexChannelMax]);

  useEffect(() => {
    if (!useEnttec || !desktopNative) {
      return;
    }

    let cancelled = false;
    void listSerialPorts()
      .then((ports) => {
        if (cancelled) return;
        setSerialPorts(ports);
        setSerialPortId((current) => {
          if (current && ports.some((portOption) => portOption.id === current)) {
            return current;
          }
          return ports[0]?.id ?? "";
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [useEnttec, desktopNative, setLastError]);

  useEffect(() => {
    if (!useEnttec || !desktopNative || !serialPortId) {
      return;
    }

    let cancelled = false;
    setConnecting(true);
    void connectEnttecProTauri(serialPortId)
      .then(() => {
        if (!cancelled) {
          setEnttecConnected(true);
          setLastError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEnttecConnected(false);
          setLastError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConnecting(false);
        }
      });

    return () => {
      cancelled = true;
      void disconnectEnttecPro();
    };
  }, [useEnttec, desktopNative, serialPortId, setLastError]);

  useEffect(() => {
    if (useEnttec) {
      return;
    }
    void disconnectEnttecPro();
    setEnttecConnected(false);
  }, [useEnttec]);

  useEffect(() => {
    if (!useDeemex) {
      return;
    }
    if (!native && !isWebMidiSupported()) {
      return;
    }

    let cancelled = false;
    void listMidiOutputs()
      .then((outputs) => {
        if (cancelled) return;
        setMidiPorts(outputs);
        setDeemexPortName((current) => {
          if (current && outputs.includes(current)) {
            return current;
          }
          return outputs[0] ?? "";
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [useDeemex, native, setLastError, setMidiPorts]);

  const handleWebConnect = async () => {
    setConnecting(true);
    try {
      if (enttecConnected) {
        await disconnectEnttecProWeb();
        setEnttecConnected(false);
      } else {
        await connectEnttecProWeb();
        setEnttecConnected(true);
      }
      setLastError(null);
    } catch (error) {
      setEnttecConnected(isEnttecProConnectedWeb());
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setConnecting(false);
    }
  };

  const canSendArtNet = native && !sending && Boolean(host.trim());
  const canSendEnttec =
    !sending &&
    !connecting &&
    (desktopNative ? Boolean(serialPortId) && enttecConnected : webSerial && enttecConnected);
  const canSendDeemex = !sending && Boolean(deemexPortName);
  const canSend = useEnttec ? canSendEnttec : useDeemex ? canSendDeemex : canSendArtNet;

  const handleSend = async () => {
    if (useEnttec) {
      setSending(true);
      try {
        const channels = buildArtNetChannels(params.channel, params.value);
        const summary = formatEnttecComposerSummary(params);
        await sendEnttecProDmx(params.universe, channels, summary);
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      } finally {
        setSending(false);
      }
      return;
    }

    if (useDeemex) {
      if (!deemexPortName) {
        setLastError(t("monitor.selectDeemexMidiPort"));
        return;
      }
      setSending(true);
      try {
        const summary = formatDeemexComposerSummary({
          channel: params.channel,
          value: params.value,
          startChannel: deemexStartChannel,
        });
        await sendDeemexDmx({
          portName: deemexPortName,
          startChannel: deemexStartChannel,
          channel: params.channel,
          value: params.value,
          summary,
        });
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      } finally {
        setSending(false);
      }
      return;
    }

    if (!host.trim()) {
      setLastError(t("monitor.enterArtNetHost"));
      return;
    }

    setSending(true);

    try {
      const channels = buildArtNetChannels(params.channel, params.value);
      const summary = formatArtNetComposerSummary(params, sequence);
      await sendArtNetDmx(host.trim(), port, params.universe, sequence, channels, summary);
      setSequence((current) => (current + 1) % 256);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <DebuggerSection title={t("monitor.composer")}>
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={debuggerComposerRowSx}>
          {showTransportSelect && (
            <FormControl size="small" sx={{ width: { xs: "100%", sm: 160 } }}>
              <InputLabel id="dmx-transport-label">{t("monitor.dmxOutput")}</InputLabel>
              <Select
                labelId="dmx-transport-label"
                label={t("monitor.dmxOutput")}
                value={transport}
                onChange={(event) => setTransport(event.target.value as DmxTransport)}
              >
                {native && <MenuItem value="artnet">{t("protocols.artnet")}</MenuItem>}
                {enttecAvailable && <MenuItem value="enttec">{t("protocols.enttec")}</MenuItem>}
                {deemexAvailable && <MenuItem value="deemex">{t("protocols.deemex")}</MenuItem>}
              </Select>
            </FormControl>
          )}

          {!useDeemex && (
            <TextField
              label={t("common.universe")}
              value={universeField.input}
              onChange={(event) => universeField.handleChange(event.target.value)}
              onBlur={universeField.handleBlur}
              inputMode="numeric"
              size="small"
              title={useEnttec ? t("monitor.enttecUniverseHint") : undefined}
              sx={{ width: { xs: "100%", sm: 104 } }}
            />
          )}

          <TextField
            label={t("common.channel")}
            value={channelField.input}
            onChange={(event) => channelField.handleChange(event.target.value)}
            onBlur={channelField.handleBlur}
            inputMode="numeric"
            size="small"
            sx={{ width: { xs: "100%", sm: 104 } }}
          />

          <TextField
            label={t("common.value")}
            value={valueField.input}
            onChange={(event) => valueField.handleChange(event.target.value)}
            onBlur={valueField.handleBlur}
            inputMode="numeric"
            size="small"
            sx={{ width: { xs: "100%", sm: 104 } }}
          />

          <Box sx={{ flex: { xs: "0 0 auto", sm: 1 }, display: { xs: "none", sm: "block" } }} />

          {useEnttec ? (
            desktopNative ? (
              <FormControl
                size="small"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  minWidth: { sm: 200 },
                  maxWidth: { sm: 320 },
                }}
              >
                <InputLabel id="enttec-port-label">{t("monitor.enttecSerialPort")}</InputLabel>
                <Select
                  labelId="enttec-port-label"
                  label={t("monitor.enttecSerialPort")}
                  value={serialPortId}
                  onChange={(event) => setSerialPortId(event.target.value)}
                  displayEmpty
                >
                  {serialPorts.length === 0 ? (
                    <MenuItem value="" disabled>
                      {t("monitor.noSerialPorts")}
                    </MenuItem>
                  ) : (
                    serialPorts.map((portOption) => (
                      <MenuItem key={portOption.id} value={portOption.id}>
                        {portOption.label}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            ) : (
              <Button
                variant="outlined"
                startIcon={enttecConnected ? <LinkOffIcon /> : <LinkIcon />}
                onClick={handleWebConnect}
                disabled={!webSerial || connecting}
                sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
              >
                {enttecConnected ? t("monitor.disconnectEnttec") : t("monitor.connectEnttec")}
              </Button>
            )
          ) : useDeemex ? (
            <>
              <FormControl
                size="small"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  minWidth: { sm: 180 },
                  maxWidth: { sm: 280 },
                }}
              >
                <InputLabel id="deemex-midi-label">{t("monitor.deemexMidiOutput")}</InputLabel>
                <Select
                  labelId="deemex-midi-label"
                  label={t("monitor.deemexMidiOutput")}
                  value={deemexPortName}
                  onChange={(event) => setDeemexPortName(event.target.value)}
                  displayEmpty
                >
                  {midiPorts.length === 0 ? (
                    <MenuItem value="" disabled>
                      {t("monitor.noMidiOutputs")}
                    </MenuItem>
                  ) : (
                    midiPorts.map((portOption) => (
                      <MenuItem key={portOption} value={portOption}>
                        {portOption}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <TextField
                label={t("monitor.deemexMidiStartChannel")}
                value={deemexStartField.input}
                onChange={(event) => deemexStartField.handleChange(event.target.value)}
                onBlur={deemexStartField.handleBlur}
                inputMode="numeric"
                size="small"
                title={t("monitor.deemexMidiHint")}
                sx={{ width: { xs: "100%", sm: 120 } }}
              />
            </>
          ) : (
            <>
              <TextField
                label={t("common.host")}
                size="small"
                value={host}
                onChange={(event) => setHost(event.target.value)}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  minWidth: { sm: 180 },
                  maxWidth: { sm: 240 },
                }}
              />

              <TextField
                label={t("common.port")}
                value={portField.input}
                onChange={(event) => portField.handleChange(event.target.value)}
                onBlur={portField.handleBlur}
                inputMode="numeric"
                size="small"
                sx={{ width: { xs: "100%", sm: 96 } }}
              />
            </>
          )}

          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!canSend}
            sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
          >
            {t("common.send")}
          </Button>
        </Stack>

        {useDeemex && (
          <Typography variant="caption" color="text.secondary">
            {t("monitor.deemexMidiHint")}{" "}
            <Link href={DEEMEX_URL} target="_blank" rel="noopener noreferrer">
              {t("monitor.deemexInterfaceLink")}
            </Link>
          </Typography>
        )}
      </Stack>
    </DebuggerSection>
  );
}
