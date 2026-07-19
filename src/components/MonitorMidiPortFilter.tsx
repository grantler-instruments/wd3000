import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  type MonitorMidiPortFilterState,
  toggleMonitorMidiPort,
} from "../lib/monitorMidiPortFilter";

interface MonitorMidiPortFilterProps {
  ports: string[];
  value: MonitorMidiPortFilterState;
  onChange: (value: MonitorMidiPortFilterState) => void;
}

export function MonitorMidiPortFilter({ ports, value, onChange }: MonitorMidiPortFilterProps) {
  const { t } = useTranslation();

  if (ports.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t("monitor.devicesAppearHere")}
      </Typography>
    );
  }

  const selected = value ?? new Set(ports);

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0 }}>
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
