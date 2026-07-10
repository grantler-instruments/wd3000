import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import {
  toggleMonitorMidiPort,
  type MonitorMidiPortFilterState,
} from "../lib/monitorMidiPortFilter";

interface MonitorMidiPortFilterProps {
  ports: string[];
  value: MonitorMidiPortFilterState;
  onChange: (value: MonitorMidiPortFilterState) => void;
}

export function MonitorMidiPortFilter({ ports, value, onChange }: MonitorMidiPortFilterProps) {
  if (ports.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Devices appear here once MIDI traffic is logged.
      </Typography>
    );
  }

  const selected = value ?? new Set(ports);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0 }}
    >
      {ports.map((port) => (
        <FormControlLabel
          key={port}
          control={
            <Checkbox
              size="small"
              checked={selected.has(port)}
              onChange={(event) =>
                onChange(toggleMonitorMidiPort(value, ports, port, event.target.checked))
              }
            />
          }
          label={port}
          sx={{ mr: 1 }}
        />
      ))}
    </Stack>
  );
}
