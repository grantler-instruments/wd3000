import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import {
  type Control,
  endpointLabel,
  KEYBOARD_DEFAULT_OCTAVES,
  KEYBOARD_DEFAULT_VELOCITY,
  KEYBOARD_MAX_OCTAVES,
  KEYBOARD_MIN_OCTAVES,
} from "../../../types";
import { type InspectorSectionProps, ProtocolEnableSection } from "../shared";

function MidiMappingFields({ control }: { control: Control }) {
  const { t } = useTranslation();
  const updateControl = useAppStore((state) => state.updateControl);

  if (control.type === "button" || control.type === "switch") {
    return (
      <TextField
        label={t("common.note")}
        size="small"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 0, max: 127 } }}
        value={control.midi.note}
        onChange={(event) =>
          updateControl(control.id, {
            midi: {
              ...control.midi,
              note: Number(event.target.value) || 0,
            },
          })
        }
      />
    );
  }

  if (control.type === "keyboard") {
    return (
      <Stack spacing={1.5}>
        <TextField
          label={t("control.startNote")}
          size="small"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 0, max: 127 } }}
          value={control.midi.note}
          onChange={(event) =>
            updateControl(control.id, {
              midi: {
                ...control.midi,
                note: Number(event.target.value) || 0,
              },
            })
          }
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label={t("control.octaves")}
            size="small"
            type="number"
            fullWidth
            slotProps={{
              htmlInput: { min: KEYBOARD_MIN_OCTAVES, max: KEYBOARD_MAX_OCTAVES },
            }}
            value={control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES}
            onChange={(event) =>
              updateControl(control.id, {
                midi: {
                  ...control.midi,
                  octaves: Math.min(
                    KEYBOARD_MAX_OCTAVES,
                    Math.max(
                      KEYBOARD_MIN_OCTAVES,
                      Number(event.target.value) || KEYBOARD_DEFAULT_OCTAVES,
                    ),
                  ),
                },
              })
            }
          />
          <TextField
            label={t("common.velocity")}
            size="small"
            type="number"
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 127 } }}
            value={control.midi.velocity ?? KEYBOARD_DEFAULT_VELOCITY}
            onChange={(event) =>
              updateControl(control.id, {
                midi: {
                  ...control.midi,
                  velocity: Math.min(
                    127,
                    Math.max(1, Number(event.target.value) || KEYBOARD_DEFAULT_VELOCITY),
                  ),
                },
              })
            }
          />
        </Stack>
      </Stack>
    );
  }

  if (control.type === "pad") {
    return (
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label={t("control.ccX")}
          size="small"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 0, max: 127 } }}
          value={control.midi.cc}
          onChange={(event) =>
            updateControl(control.id, {
              midi: {
                ...control.midi,
                cc: Number(event.target.value) || 0,
              },
            })
          }
        />
        <TextField
          label={t("control.ccY")}
          size="small"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 0, max: 127 } }}
          value={control.midi.ccY ?? control.midi.cc + 1}
          onChange={(event) =>
            updateControl(control.id, {
              midi: {
                ...control.midi,
                ccY: Number(event.target.value) || 0,
              },
            })
          }
        />
      </Stack>
    );
  }

  return (
    <TextField
      label={t("control.cc")}
      size="small"
      type="number"
      fullWidth
      slotProps={{ htmlInput: { min: 0, max: 127 } }}
      value={control.midi.cc}
      onChange={(event) =>
        updateControl(control.id, {
          midi: {
            ...control.midi,
            cc: Number(event.target.value) || 0,
          },
        })
      }
    />
  );
}

export function MidiSection({ control, compact = false }: InspectorSectionProps) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);

  return (
    <ProtocolEnableSection
      label={t("protocols.midi")}
      enabled={control.midi.enabled}
      description={control.midi.enabled ? t("control.midiPick") : t("control.midiAssign")}
      compact={compact}
      onToggle={(enabled) =>
        updateControl(control.id, {
          midi: { ...control.midi, enabled },
          midiOutputId: enabled
            ? (control.midiOutputId ?? performerIo.midiOutputs[0]?.id ?? null)
            : control.midiOutputId,
        })
      }
    >
      <FormControl fullWidth size="small">
        <InputLabel id="control-midi-output-label">{t("common.output")}</InputLabel>
        <Select
          labelId="control-midi-output-label"
          label={t("common.output")}
          value={control.midiOutputId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              midiOutputId: event.target.value || null,
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

      <FormControl fullWidth size="small">
        <InputLabel id="control-midi-input-label">{t("common.input")}</InputLabel>
        <Select
          labelId="control-midi-input-label"
          label={t("common.input")}
          value={control.midiInputId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              midiInputId: event.target.value || null,
            })
          }
        >
          <MenuItem value="">{t("control.anyInput")}</MenuItem>
          {performerIo.midiInputs.map((endpoint) => (
            <MenuItem key={endpoint.id} value={endpoint.id}>
              {endpointLabel(endpoint.name, endpoint.portName)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("common.channel")}
        size="small"
        type="number"
        fullWidth
        slotProps={{ htmlInput: { min: 1, max: 16 } }}
        value={control.midi.channel}
        onChange={(event) =>
          updateControl(control.id, {
            midi: {
              ...control.midi,
              channel: Number(event.target.value) || 1,
            },
          })
        }
      />

      <MidiMappingFields control={control} />
    </ProtocolEnableSection>
  );
}
