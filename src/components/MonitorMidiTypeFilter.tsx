import { Checkbox, FormControlLabel, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { MidiDebugKind } from "../lib/midiTypes";
import {
  MONITOR_MIDI_KINDS,
  type MonitorMidiTypeFilterState,
  toggleMonitorMidiType,
} from "../lib/monitorMidiFilter";

const MIDI_KIND_KEYS: Record<MidiDebugKind, string> = {
  "midi-note": "midiKinds.note",
  "midi-cc": "midiKinds.cc",
  "midi-pc": "midiKinds.pc",
  "midi-pitch-bend": "midiKinds.pitch",
  "midi-pressure": "midiKinds.pressure",
  "midi-poly-pressure": "midiKinds.polyAt",
  "midi-mtc": "midiKinds.mtc",
  "midi-song-position": "midiKinds.songPos",
  "midi-song-select": "midiKinds.songSel",
  "midi-tune-request": "midiKinds.tune",
  "midi-sysex": "midiKinds.sysex",
  "midi-sysex-end": "midiKinds.eox",
  "midi-timing-clock": "midiKinds.clock",
  "midi-start": "midiKinds.start",
  "midi-continue": "midiKinds.continue",
  "midi-stop": "midiKinds.stop",
  "midi-active-sensing": "midiKinds.sense",
  "midi-system-reset": "midiKinds.reset",
  "midi-raw": "midiKinds.raw",
};

interface MonitorMidiTypeFilterProps {
  value: MonitorMidiTypeFilterState;
  onChange: (value: MonitorMidiTypeFilterState) => void;
}

export function MonitorMidiTypeFilter({ value, onChange }: MonitorMidiTypeFilterProps) {
  const { t } = useTranslation();

  const handleChange = (kind: MidiDebugKind, checked: boolean) => {
    onChange(toggleMonitorMidiType(value, kind, checked));
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0 }}>
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
          label={t(MIDI_KIND_KEYS[kind])}
          sx={{ mr: 1 }}
        />
      ))}
    </Stack>
  );
}
