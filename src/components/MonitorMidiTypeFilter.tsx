import { Checkbox, FormControlLabel, Stack } from "@mui/material";
import {
  MONITOR_MIDI_KINDS,
  toggleMonitorMidiType,
  type MonitorMidiTypeFilterState,
} from "../lib/monitorMidiFilter";
import { midiKindLabel, type MidiDebugKind } from "../lib/midiTypes";

interface MonitorMidiTypeFilterProps {
  value: MonitorMidiTypeFilterState;
  onChange: (value: MonitorMidiTypeFilterState) => void;
}

export function MonitorMidiTypeFilter({ value, onChange }: MonitorMidiTypeFilterProps) {
  const handleChange = (kind: MidiDebugKind, checked: boolean) => {
    onChange(toggleMonitorMidiType(value, kind, checked));
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0 }}
    >
      {MONITOR_MIDI_KINDS.map((kind) => (
        <FormControlLabel
          key={kind}
          control={
            <Checkbox
              size="small"
              checked={value.has(kind)}
              onChange={(event) => handleChange(kind, event.target.checked)}
            />
          }
          label={midiKindLabel(kind)}
          sx={{ mr: 1 }}
        />
      ))}
    </Stack>
  );
}
