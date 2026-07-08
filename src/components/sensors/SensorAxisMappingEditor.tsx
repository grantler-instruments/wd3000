import type { ReactNode } from "react";
import {
  Alert,
  Box,
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
import { isNativeApp, isWebMidiSupported } from "../../lib/platform";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
} from "../../lib/sensors/types";
import { useAppStore } from "../../store/useAppStore";
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
  return (
    <Box
      sx={{
        border: 1,
        borderColor: enabled ? "primary.main" : "divider",
        borderRadius: 1,
        p: 1.5,
      }}
    >
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
          aria-label={`${enabled ? "Disable" : "Enable"} ${label}`}
        />
      </Stack>
      {enabled ? <Stack spacing={1} sx={{ mt: 1.5 }}>{children}</Stack> : null}
    </Box>
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
  const mappingKey = sensorAxisKey(sensorId, axis);
  const storedMapping = useAppStore((state) => state.sensorMappings[mappingKey]);
  const output = useAppStore((state) => state.output);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const updateSensorAxisMapping = useAppStore((state) => state.updateSensorAxisMapping);
  const mapping = useMemo(
    () =>
      storedMapping
        ? normalizeSensorAxisMapping(storedMapping, output, sensorId, axis)
        : defaultSensorAxisMapping(sensorId, axis, output),
    [axis, output, sensorId, storedMapping],
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
        Outputs
      </Typography>

      <Stack spacing={1.5}>
        <MappingProtocolSection
          label="OSC"
          enabled={mapping.osc.enabled}
          onToggle={(enabled) => updateSensorAxisMapping(sensorId, axis, { osc: { enabled } })}
        >
          <Stack direction="row" spacing={1}>
            <TextField
              label="Host"
              size="small"
              fullWidth
              value={mapping.osc.host}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  osc: { host: event.target.value },
                })
              }
            />
            <TextField
              label="Port"
              size="small"
              type="number"
              sx={{ width: 120 }}
              value={mapping.osc.port}
              onChange={(event) =>
                updateSensorAxisMapping(sensorId, axis, {
                  osc: { port: Number(event.target.value) || 9000 },
                })
              }
            />
          </Stack>
          <TextField
            label="Address"
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
          label="MIDI"
          enabled={mapping.midi.enabled}
          onToggle={(enabled) => updateSensorAxisMapping(sensorId, axis, { midi: { enabled } })}
        >
          {!isNativeApp() && !isWebMidiSupported() ? (
            <Alert severity="warning" sx={{ py: 0 }}>
              Web MIDI is not supported in this browser.
            </Alert>
          ) : midiPorts.length === 0 ? (
            <Alert severity="warning" sx={{ py: 0 }}>
              No MIDI output ports found. Refresh ports in Preferences.
            </Alert>
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel id={`${sensorId}-${axis}-midi-port-label`}>Output port</InputLabel>
              <Select
                labelId={`${sensorId}-${axis}-midi-port-label`}
                label="Output port"
                value={mapping.midi.portName ?? ""}
                onChange={(event) =>
                  updateSensorAxisMapping(sensorId, axis, {
                    midi: { portName: event.target.value || null },
                  })
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {midiPorts.map((port) => (
                  <MenuItem key={port} value={port}>
                    {port}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Stack direction="row" spacing={1}>
            <TextField
              label="Channel"
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
              label="CC"
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
              label="Input min"
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
              label="Input max"
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
