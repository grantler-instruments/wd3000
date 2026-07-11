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
import {
  MQTT_DEFAULT_COMPOSER_HOST,
  MQTT_DEFAULT_TCP_PORT,
  type MqttQoS,
  type MqttTransportProtocol,
} from "../lib/mqtt";
import { sendMqttMessage } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";

const QOS_OPTIONS: MqttQoS[] = [0, 1, 2];
const PROTOCOL_OPTIONS: MqttTransportProtocol[] = ["tcp", "ws"];

function clampPort(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 1 || value > 65535) {
    return fallback;
  }
  return Math.round(value);
}

export function MqttComposer() {
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const [host, setHost] = useState(output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST);
  const [port, setPort] = useState(output.mqttComposerPort || MQTT_DEFAULT_TCP_PORT);
  const [protocol, setProtocol] = useState<MqttTransportProtocol>(
    output.mqttComposerProtocol || "tcp",
  );
  const [topic, setTopic] = useState("wd3000/test");
  const [payload, setPayload] = useState("hello");
  const [qos, setQos] = useState<MqttQoS>(0);
  const [retain, setRetain] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setHost(output.mqttComposerHost || MQTT_DEFAULT_COMPOSER_HOST);
    setPort(output.mqttComposerPort || MQTT_DEFAULT_TCP_PORT);
    setProtocol(output.mqttComposerProtocol || "tcp");
  }, [output.mqttComposerHost, output.mqttComposerPort, output.mqttComposerProtocol]);

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
    <DebuggerSection title="Composer">
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="mqtt-protocol-label">Protocol</InputLabel>
            <Select
              labelId="mqtt-protocol-label"
              label="Protocol"
              value={protocol}
              onChange={(event) => {
                const nextProtocol = event.target.value as MqttTransportProtocol;
                setProtocol(nextProtocol);
                setOutput({ mqttComposerProtocol: nextProtocol });
              }}
              disabled={!native}
            >
              {PROTOCOL_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Host"
            size="small"
            value={host}
            onChange={(event) => {
              const nextHost = event.target.value;
              setHost(nextHost);
              setOutput({ mqttComposerHost: nextHost });
            }}
            disabled={!native}
            sx={{ minWidth: 180, flex: 1 }}
          />

          <TextField
            label="Port"
            size="small"
            type="number"
            value={port}
            onChange={(event) => {
              const nextPort = clampPort(Number(event.target.value), MQTT_DEFAULT_TCP_PORT);
              setPort(nextPort);
              setOutput({ mqttComposerPort: nextPort });
            }}
            disabled={!native}
            sx={{ width: 120 }}
            slotProps={{
              htmlInput: { min: 1, max: 65535 },
            }}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            label="Topic"
            size="small"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            disabled={!native}
            sx={{ minWidth: 220, flex: 1 }}
          />

          <TextField
            label="Payload"
            size="small"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            disabled={!native}
            sx={{ minWidth: 220, flex: 1 }}
          />

          <FormControl size="small" sx={{ minWidth: 88 }}>
            <InputLabel id="mqtt-qos-label">QoS</InputLabel>
            <Select
              labelId="mqtt-qos-label"
              label="QoS"
              value={qos}
              onChange={(event) => setQos(Number(event.target.value) as MqttQoS)}
              disabled={!native}
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
                disabled={!native}
              />
            }
            label="Retain"
          />

          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={!native || sending || !topic.trim() || !host.trim()}
            sx={{ flexShrink: 0 }}
          >
            Publish
          </Button>
        </Stack>
      </Stack>
    </DebuggerSection>
  );
}
