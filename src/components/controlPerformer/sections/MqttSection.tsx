import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import type { Control } from "../../../types";
import { endpointLabel } from "../../../types";
import { type InspectorSectionProps, ProtocolEnableSection } from "../shared";

export function MqttSection({ control, compact = false }: InspectorSectionProps) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);

  return (
    <ProtocolEnableSection
      label={t("protocols.mqtt")}
      enabled={control.mqtt.enabled}
      description={control.mqtt.enabled ? t("control.mqttPick") : t("control.mqttAssign")}
      compact={compact}
      onToggle={(enabled) =>
        updateControl(control.id, {
          mqtt: { ...control.mqtt, enabled },
          mqttConnectionId: enabled
            ? (control.mqttConnectionId ?? performerIo.mqttConnections[0]?.id ?? null)
            : control.mqttConnectionId,
        })
      }
    >
      <FormControl fullWidth size="small">
        <InputLabel id="control-mqtt-connection-label">{t("common.broker")}</InputLabel>
        <Select
          labelId="control-mqtt-connection-label"
          label={t("common.broker")}
          value={control.mqttConnectionId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              mqttConnectionId: event.target.value || null,
            })
          }
        >
          {performerIo.mqttConnections.length === 0 && (
            <MenuItem value="" disabled>
              {t("control.addBrokersInIo")}
            </MenuItem>
          )}
          {performerIo.mqttConnections.map((connection) => (
            <MenuItem key={connection.id} value={connection.id}>
              {endpointLabel(
                connection.name,
                `${connection.protocol.toUpperCase()} ${connection.host}:${connection.port}`,
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("common.topic")}
        size="small"
        fullWidth
        value={control.mqtt.topic}
        onChange={(event) =>
          updateControl(control.id, {
            mqtt: { ...control.mqtt, topic: event.target.value },
          })
        }
        slotProps={{
          htmlInput: {
            autoCapitalize: "off",
            autoCorrect: "off",
            spellCheck: "false",
          },
        }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <FormControl fullWidth size="small">
          <InputLabel id="control-mqtt-qos-label">{t("common.qos")}</InputLabel>
          <Select
            labelId="control-mqtt-qos-label"
            label={t("common.qos")}
            value={control.mqtt.qos}
            onChange={(event) =>
              updateControl(control.id, {
                mqtt: {
                  ...control.mqtt,
                  qos: Number(event.target.value) as Control["mqtt"]["qos"],
                },
              })
            }
          >
            <MenuItem value={0}>0</MenuItem>
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="control-mqtt-retain-label">{t("common.retain")}</InputLabel>
          <Select
            labelId="control-mqtt-retain-label"
            label={t("common.retain")}
            value={control.mqtt.retain ? "yes" : "no"}
            onChange={(event) =>
              updateControl(control.id, {
                mqtt: {
                  ...control.mqtt,
                  retain: event.target.value === "yes",
                },
              })
            }
          >
            <MenuItem value="no">{t("common.no")}</MenuItem>
            <MenuItem value="yes">{t("common.yes")}</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </ProtocolEnableSection>
  );
}
