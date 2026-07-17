import {
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { startMqttBroker, stopMqttBroker } from "../lib/input";
import { MQTT_DEFAULT_TCP_PORT, MQTT_DEFAULT_WS_PORT } from "../lib/mqtt";
import { getLocalIp } from "../lib/network";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";

function clampPort(value: number, fallback: number) {
  if (!Number.isFinite(value) || value < 1 || value > 65535) {
    return fallback;
  }
  return Math.round(value);
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function MqttBroker() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();
  const mountedRef = useRef(true);

  const [active, setActive] = useState(output.mqttBrokerEnabled);
  const [tcpPort, setTcpPort] = useState(output.mqttBrokerPort || MQTT_DEFAULT_TCP_PORT);
  const [wsPort, setWsPort] = useState(output.mqttBrokerWsPort || MQTT_DEFAULT_WS_PORT);
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [localIpLoaded, setLocalIpLoaded] = useState(false);

  useEffect(() => {
    if (!native) {
      setLocalIp(null);
      setLocalIpLoaded(false);
      return;
    }

    let cancelled = false;
    setLocalIpLoaded(false);

    void getLocalIp()
      .then((ip) => {
        if (!cancelled) {
          setLocalIp(ip);
          setLocalIpLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalIp(null);
          setLocalIpLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [native]);

  useEffect(() => {
    setActive(output.mqttBrokerEnabled);
    setTcpPort(output.mqttBrokerPort || MQTT_DEFAULT_TCP_PORT);
    setWsPort(output.mqttBrokerWsPort || MQTT_DEFAULT_WS_PORT);
  }, [output.mqttBrokerEnabled, output.mqttBrokerPort, output.mqttBrokerWsPort]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!native) {
      return;
    }

    let cancelled = false;

    const syncBroker = async () => {
      try {
        if (active) {
          await startMqttBroker(tcpPort, wsPort);
        } else {
          await stopMqttBroker();
        }
        if (!cancelled && mountedRef.current) {
          setLastError(null);
        }
      } catch (error) {
        if (!cancelled && mountedRef.current) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void syncBroker();

    return () => {
      cancelled = true;
    };
  }, [active, native, setLastError, tcpPort, wsPort]);

  useEffect(() => {
    if (!native) {
      return;
    }

    return () => {
      void stopMqttBroker();
    };
  }, [native]);

  const portsConflict = tcpPort === wsPort;

  return (
    <DebuggerSection
      title={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <Typography variant="subtitle2">{t("common.broker")}</Typography>
          {native ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
            >
              {localIpLoaded ? (localIp ?? "—") : "…"}
            </Typography>
          ) : null}
        </Stack>
      }
      headerAction={
        <Switch
          size="small"
          checked={active}
          onClick={stopPropagation}
          onChange={(event) => {
            const nextActive = event.target.checked;
            setActive(nextActive);
            setOutput({ mqttBrokerEnabled: nextActive });
          }}
          disabled={!native || portsConflict}
          aria-label={active ? t("monitor.deactivateBroker") : t("monitor.activateBroker")}
        />
      }
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}
      >
        <TextField
          label={t("monitor.tcpPort")}
          size="small"
          type="number"
          value={tcpPort}
          onChange={(event) => {
            const nextPort = clampPort(Number(event.target.value), MQTT_DEFAULT_TCP_PORT);
            setTcpPort(nextPort);
            setOutput({ mqttBrokerPort: nextPort });
          }}
          disabled={!native || active}
          sx={{ maxWidth: 140 }}
          slotProps={{
            htmlInput: { min: 1, max: 65535 },
          }}
        />

        <TextField
          label={t("monitor.wsPort")}
          size="small"
          type="number"
          value={wsPort}
          onChange={(event) => {
            const nextPort = clampPort(Number(event.target.value), MQTT_DEFAULT_WS_PORT);
            setWsPort(nextPort);
            setOutput({ mqttBrokerWsPort: nextPort });
          }}
          disabled={!native || active}
          sx={{ maxWidth: 140 }}
          slotProps={{
            htmlInput: { min: 1, max: 65535 },
          }}
        />
      </Stack>
    </DebuggerSection>
  );
}
