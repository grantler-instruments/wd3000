import SendIcon from "@mui/icons-material/Send";
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  defaultMqttClientPort,
  isMqttClientSupported,
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
  MQTT_DEFAULT_WS_PORT,
  type MqttQoS,
  type MqttTransportProtocol,
} from "../lib/mqtt";
import { clampPort } from "../lib/network";
import { sendMqttMessage } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";
import { debuggerComposerRowSx } from "./debuggerLayoutSx";

const QOS_OPTIONS: MqttQoS[] = [0, 1, 2];

export function MqttComposer() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();
  const protocolOptions: MqttTransportProtocol[] = native ? ["tcp", "ws"] : ["ws"];

  const storedProtocol = output.mqttComposerProtocol || (native ? "tcp" : "ws");
  const storedPort = output.mqttComposerPort || defaultMqttClientPort(storedProtocol);

  const [host, setHost] = useState(output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST);
  const [port, setPort] = useState(storedPort);
  const [protocol, setProtocol] = useState<MqttTransportProtocol>(storedProtocol);
  const [topic, setTopic] = useState("wd3000/test");
  const [payload, setPayload] = useState("hello");
  const [qos, setQos] = useState<MqttQoS>(0);
  const [retain, setRetain] = useState(false);
  const [sending, setSending] = useState(false);

  const clientEnabled = isMqttClientSupported(protocol);

  useEffect(() => {
    if (native || storedProtocol === "ws") {
      return;
    }

    const nextPort = storedPort === MQTT_DEFAULT_TCP_PORT ? MQTT_DEFAULT_WS_PORT : storedPort;
    setOutput({
      mqttComposerProtocol: "ws",
      mqttComposerPort: nextPort,
    });
  }, [native, setOutput, storedPort, storedProtocol]);

  useEffect(() => {
    setHost(output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST);
    setPort(storedPort);
    setProtocol(storedProtocol);
  }, [output.mqttComposerHost, storedPort, storedProtocol]);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendMqttMessage(host, port, protocol, topic, payload, qos, retain);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <DebuggerSection title={t("monitor.composer")}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={debuggerComposerRowSx}>
          <FormControl
            size="small"
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 100 } }}
          >
            <InputLabel id="mqtt-protocol-label">{t("common.protocol")}</InputLabel>
            <Select
              labelId="mqtt-protocol-label"
              label={t("common.protocol")}
              value={protocolOptions.includes(protocol) ? protocol : "ws"}
              onChange={(event) => {
                const nextProtocol = event.target.value as MqttTransportProtocol;
                setProtocol(nextProtocol);
                const nextPort =
                  nextProtocol === "ws" && port === MQTT_DEFAULT_TCP_PORT
                    ? MQTT_DEFAULT_WS_PORT
                    : nextProtocol === "tcp" && port === MQTT_DEFAULT_WS_PORT
                      ? MQTT_DEFAULT_TCP_PORT
                      : port;
                setPort(nextPort);
                setOutput({
                  mqttComposerProtocol: nextProtocol,
                  mqttComposerPort: nextPort,
                });
              }}
              disabled={!native && protocolOptions.length <= 1}
            >
              {protocolOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`protocols.${value}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t("common.host")}
            size="small"
            value={host}
            onChange={(event) => {
              const nextHost = event.target.value;
              setHost(nextHost);
              setOutput({ mqttComposerHost: nextHost });
            }}
            disabled={!clientEnabled}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 180 }, flex: { sm: 1 } }}
          />

          <TextField
            label={t("common.port")}
            size="small"
            type="number"
            value={port}
            onChange={(event) => {
              const nextPort = clampPort(
                Number(event.target.value),
                defaultMqttClientPort(protocol),
              );
              setPort(nextPort);
              setOutput({ mqttComposerPort: nextPort });
            }}
            disabled={!clientEnabled}
            sx={{ width: { xs: "100%", sm: 120 } }}
            slotProps={{
              htmlInput: { min: 1, max: 65535 },
            }}
          />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={debuggerComposerRowSx}>
          <TextField
            label={t("common.topic")}
            size="small"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            disabled={!clientEnabled}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 220 }, flex: { sm: 1 } }}
          />

          <TextField
            label={t("common.payload")}
            size="small"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            disabled={!clientEnabled}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 220 }, flex: { sm: 1 } }}
          />

          <FormControl
            size="small"
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 88 } }}
          >
            <InputLabel id="mqtt-qos-label">{t("common.qos")}</InputLabel>
            <Select
              labelId="mqtt-qos-label"
              label={t("common.qos")}
              value={qos}
              onChange={(event) => setQos(Number(event.target.value) as MqttQoS)}
              disabled={!clientEnabled}
            >
              {QOS_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={retain}
                onChange={(event) => setRetain(event.target.checked)}
                size="small"
                disabled={!clientEnabled}
              />
            }
            label={t("common.retain")}
          />

          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!clientEnabled || sending || !topic.trim() || !host.trim()}
            sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
          >
            {t("monitor.publish")}
          </Button>
        </Stack>
      </Stack>
    </DebuggerSection>
  );
}
