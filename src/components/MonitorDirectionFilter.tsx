import { Checkbox, FormControlLabel, Stack } from "@mui/material";
import type { MonitorDirectionFilterState } from "../lib/monitorLogFilter";

interface MonitorDirectionFilterProps {
  value: MonitorDirectionFilterState;
  onChange: (value: MonitorDirectionFilterState) => void;
}

export function MonitorDirectionFilter({ value, onChange }: MonitorDirectionFilterProps) {
  const handleInChange = (checked: boolean) => {
    if (!checked && !value.showOut) {
      return;
    }
    onChange({ ...value, showIn: checked });
  };

  const handleOutChange = (checked: boolean) => {
    if (!checked && !value.showIn) {
      return;
    }
    onChange({ ...value, showOut: checked });
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={value.showIn}
            onChange={(event) => handleInChange(event.target.checked)}
          />
        }
        label="IN (received)"
        sx={{ mr: 0 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={value.showOut}
            onChange={(event) => handleOutChange(event.target.checked)}
          />
        }
        label="OUT (sent by WD3000)"
      />
    </Stack>
  );
}
