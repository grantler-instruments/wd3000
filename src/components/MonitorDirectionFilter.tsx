import { Checkbox, FormControlLabel, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { MonitorDirectionFilterState } from "../lib/monitorLogFilter";

interface MonitorDirectionFilterProps {
  value: MonitorDirectionFilterState;
  onChange: (value: MonitorDirectionFilterState) => void;
}

export function MonitorDirectionFilter({ value, onChange }: MonitorDirectionFilterProps) {
  const { t } = useTranslation();

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
        label={t("monitor.directionIn")}
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
        label={t("monitor.directionOut")}
      />
    </Stack>
  );
}
