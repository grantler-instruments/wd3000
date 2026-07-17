import type { ReactNode } from "react";
import {
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
} from "../../lib/sensors/types";
import { useAppStore } from "../../store/useAppStore";
import { endpointLabel } from "../../types";
import { SensorAxisRow } from "./SensorCard";

function MappingProtocolSection({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Stack spacing={enabled ? 1.5 : 0}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="subtitle2">{label}</Typography>
        <Switch
          size="small"
          checked={enabled}
          onChange={(_, checked) => onToggle(checked)}
          aria-label={
            enabled
              ? t("sensors.disableNamed", { label })
              : t("sensors.enableNamed", { label })
          }
        />
      </Stack>
      {enabled ? <Stack spacing={1}>{children}</Stack> : null}
    </Stack>
  );
}

export function SensorAxisMappingEditor({
  sensorId,
  axis,
  value,
  unit,
}: {
  sensorId: string;
  axis: string;
  value: number | null | undefined;
  unit?: string;
}) {
  const { t } = useTranslation();
  const mappingKey = sensorAxisKey(sensorId, axis);
  const storedMapping = useAppStore((state) => state.sensorMappings[mappingKey]);
  const performerIo = useAppStore((state) => state.performerIo);
  const updateSensorAxisMapping = useAppStore((state) => state.updateSensorAxisMapping);
  const mapping = useMemo(
    () =>
      storedMapping
        ? normalizeSensorAxisMapping(storedMapping, performerIo, sensorId, axis)
        : defaultSensorAxisMapping(sensorId, axis, performerIo),
    [axis, performerIo, sensorId, storedMapping],
  );

  return (
    <Stack
      spacing={1.5}
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-child": { borderBottom: 0, pb: 0 },
      }}
    >
      <SensorAxisRow label={axis} value={value} unit={unit} />

      <Divider />

      <Typography variant="caption" color="text.secondary">
        {t("sensors.outputs")}
      </Typography>

      <Stack spacing={1.5}>
        <MappingProtocolSection
          label={t("protocols.osc")}
          enabled={mapping.osc.enabled}
          onToggle={(enabled) => updateSensorAxisMapping(sensorId, axis, { osc: { enabled } })}
        >
          <FormControl fullWidth size="small">
            <InputLabel id={`${sensorId}-${axis}-osc-sender-label`}>
              {t("control.sender")}
            </InputLabel>
            <Select
              labelId={`${sensorId}-${axis}-osc-sender-label`}
              label={t("control.sender")}
              value={mapping.osc.senderId ?? ""}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  osc: { senderId: event.target.value || null },
                })
              }
            >
              {performerIo.oscSenders.length === 0 && (
                <MenuItem value="" disabled>
                  {t("control.addSendersInIo")}
                </MenuItem>
              )}
              {performerIo.oscSenders.map((sender) => (
                <MenuItem key={sender.id} value={sender.id}>
                  {endpointLabel(sender.name, `${sender.host}:${sender.port}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t("common.address")}
            size="small"
            value={mapping.osc.address}
            onChange={(event) =>
              updateSensorAxisMapping(sensorId, axis, {
                osc: { address: event.target.value },
              })
            }
          />
        </MappingProtocolSection>

        <MappingProtocolSection
          label={t("protocols.midi")}
          enabled={mapping.midi.enabled}
          onToggle={(enabled) => updateSensorAxisMapping(sensorId, axis, { midi: { enabled } })}
        >
          <FormControl fullWidth size="small">
            <InputLabel id={`${sensorId}-${axis}-midi-output-label`}>
              {t("common.output")}
            </InputLabel>
            <Select
              labelId={`${sensorId}-${axis}-midi-output-label`}
              label={t("common.output")}
              value={mapping.midi.outputId ?? ""}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  midi: { outputId: event.target.value || null },
                })
              }
            >
              {performerIo.midiOutputs.length === 0 && (
                <MenuItem value="" disabled>
                  {t("control.addOutputsInIo")}
                </MenuItem>
              )}
              {performerIo.midiOutputs.map((endpoint) => (
                <MenuItem key={endpoint.id} value={endpoint.id}>
                  {endpointLabel(endpoint.name, endpoint.portName)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <TextField
              label={t("common.channel")}
              size="small"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 16 } }}
              value={mapping.midi.channel}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  midi: { channel: Number(event.target.value) || 1 },
                })
              }
            />
            <TextField
              label={t("control.cc")}
              size="small"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { min: 0, max: 127 } }}
              value={mapping.midi.cc}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  midi: { cc: Number(event.target.value) || 0 },
                })
              }
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label={t("sensors.inputMin")}
              size="small"
              type="number"
              fullWidth
              value={mapping.midi.min}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  midi: { min: Number(event.target.value) || 0 },
                })
              }
            />
            <TextField
              label={t("sensors.inputMax")}
              size="small"
              type="number"
              fullWidth
              value={mapping.midi.max}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  midi: { max: Number(event.target.value) || 0 },
                })
              }
            />
          </Stack>
        </MappingProtocolSection>
      </Stack>
    </Stack>
  );
}
