import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import { useViewportSize } from "../hooks/useViewportSize";
import { useAppStore } from "../store/useAppStore";
import { SettingsSectionNav } from "./SettingsSectionNav";
import { settingsTheme } from "../theme";
import {
  CONTROL_COLOR_PRESETS,
  Control,
  ControlProtocol,
  ControlTab,
  ControlType,
  KEYBOARD_DEFAULT_OCTAVES,
  KEYBOARD_DEFAULT_VELOCITY,
  KEYBOARD_MAX_OCTAVES,
  KEYBOARD_MIN_OCTAVES,
  SliderOrientation,
  controlCanvasSizeLimits,
  controlLayoutHeight,
  controlTabs,
  controlTypeLabel,
  endpointLabel,
  isValidControlColor,
} from "../types";

type InspectorSection = "general" | "layout" | "osc" | "midi";

const SECTIONS: { id: InspectorSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "layout", label: "Layout" },
  { id: "osc", label: "OSC" },
  { id: "midi", label: "MIDI" },
];

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

function UnusedSection({ message }: { message: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 2.5,
        bgcolor: "action.hover",
        borderStyle: "dashed",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Paper>
  );
}

function ColorSwatch({
  color,
  selected,
  label,
  onClick,
}: {
  color?: string;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 28,
        height: 28,
        p: 0,
        borderRadius: "50%",
        border: 2,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: color ?? "background.default",
        backgroundImage: color
          ? undefined
          : (theme) =>
              `linear-gradient(135deg, transparent 46%, ${theme.palette.divider} 46%, ${theme.palette.divider} 54%, transparent 54%)`,
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
  );
}

function GeneralSection({ control }: { control: Control }) {
  const controls = useAppStore((state) => state.controls);
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);
  const assignControlToTab = useAppStore((state) => state.assignControlToTab);
  const removeTabChildren = useAppStore((state) => state.removeTabChildren);

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title="General"
        description="Name, appearance, and widget type."
      />

      <TextField
        label="Label"
        size="small"
        fullWidth
        value={control.label}
        onChange={(event) => updateControl(control.id, { label: event.target.value })}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <FormControl fullWidth size="small">
          <InputLabel id="control-type-label">Type</InputLabel>
          <Select
            labelId="control-type-label"
            label="Type"
            value={control.type}
            onChange={(event) =>
              updateControl(control.id, { type: event.target.value as ControlType })
            }
          >
            <MenuItem value="button">Button</MenuItem>
            <MenuItem value="slider">Slider</MenuItem>
            <MenuItem value="keyboard">Keyboard</MenuItem>
            <MenuItem value="pad">2D pad</MenuItem>
            <MenuItem value="tabs">Tabs</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="control-protocol-label">Output</InputLabel>
          <Select
            labelId="control-protocol-label"
            label="Output"
            value={control.protocol}
            onChange={(event) => {
              const protocol = event.target.value as ControlProtocol;
              updateControl(control.id, {
                protocol,
                oscSenderId:
                  protocol === "osc" || protocol === "both"
                    ? (control.oscSenderId ?? performerIo.oscSenders[0]?.id ?? null)
                    : null,
                midiOutputId:
                  protocol === "midi" || protocol === "both"
                    ? (control.midiOutputId ?? performerIo.midiOutputs[0]?.id ?? null)
                    : null,
              });
            }}
          >
            <MenuItem value="osc">OSC</MenuItem>
            <MenuItem value="midi">MIDI</MenuItem>
            <MenuItem value="both">OSC + MIDI</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Color
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
          <ColorSwatch
            label="Default theme color"
            selected={!control.color}
            onClick={() => updateControl(control.id, { color: null })}
          />
          {CONTROL_COLOR_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={`Set color to ${color}`}
              selected={control.color === color}
              onClick={() => updateControl(control.id, { color })}
            />
          ))}
          <Box
            component="label"
            sx={{
              position: "relative",
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: 2,
              borderColor:
                control.color &&
                !CONTROL_COLOR_PRESETS.includes(
                  control.color as (typeof CONTROL_COLOR_PRESETS)[number],
                )
                  ? "primary.main"
                  : "divider",
              bgcolor: control.color ?? "background.paper",
              cursor: "pointer",
              overflow: "hidden",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="input"
              type="color"
              value={
                control.color && isValidControlColor(control.color)
                  ? control.color
                  : "#2196f3"
              }
              onChange={(event) => updateControl(control.id, { color: event.target.value })}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
                border: 0,
                p: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ pointerEvents: "none" }}>
              +
            </Typography>
          </Box>
        </Stack>
      </Box>

      {control.type === "slider" && (
        <FormControl fullWidth size="small">
          <InputLabel id="slider-orientation-label">Orientation</InputLabel>
          <Select
            labelId="slider-orientation-label"
            label="Orientation"
            value={control.sliderOrientation ?? "horizontal"}
            onChange={(event) =>
              updateControl(control.id, {
                sliderOrientation: event.target.value as SliderOrientation,
              })
            }
          >
            <MenuItem value="horizontal">Horizontal</MenuItem>
            <MenuItem value="vertical">Vertical</MenuItem>
          </Select>
        </FormControl>
      )}

      {control.type === "tabs" && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <Typography variant="subtitle2">Tabs</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                const tabs = controlTabs(control);
                const nextTab: ControlTab = {
                  id: crypto.randomUUID(),
                  label: `Tab ${tabs.length + 1}`,
                };
                updateControl(control.id, { tabs: [...tabs, nextTab] });
              }}
            >
              Add
            </Button>
          </Stack>
          <Stack spacing={1}>
            {controlTabs(control).map((tab, index) => (
              <Paper key={tab.id} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label={`Tab ${index + 1}`}
                    size="small"
                    fullWidth
                    value={tab.label}
                    onChange={(event) => {
                      const tabs = controlTabs(control).map((entry) =>
                        entry.id === tab.id
                          ? { ...entry, label: event.target.value }
                          : entry,
                      );
                      updateControl(control.id, { tabs });
                    }}
                  />
                  <IconButton
                    aria-label={`Remove tab ${index + 1}`}
                    size="small"
                    disabled={controlTabs(control).length <= 1}
                    onClick={() => {
                      removeTabChildren(control.id, tab.id);
                      const tabs = controlTabs(control).filter((entry) => entry.id !== tab.id);
                      updateControl(control.id, { tabs });
                    }}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {control.parentId && (
        <Paper variant="outlined" sx={{ px: 1.5, py: 1.25 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Placement
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Inside{" "}
            {controls.find((entry) => entry.id === control.parentId)?.label ?? "tabs widget"}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => assignControlToTab(control.id, null, null)}
          >
            Move to canvas
          </Button>
        </Paper>
      )}
    </Stack>
  );
}

function LayoutSection({ control }: { control: Control }) {
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const { width: canvasWidth, height: canvasHeight } = useViewportSize();
  const sizeLimits = controlCanvasSizeLimits(
    control,
    { width: canvasWidth, height: canvasHeight },
    true,
  );

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title="Layout"
        description="Position and size on the canvas."
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label="Width"
          size="small"
          type="number"
          fullWidth
          slotProps={{
            htmlInput: { min: sizeLimits.minWidth, max: sizeLimits.maxWidth, step: 16 },
          }}
          value={control.layout.width}
          onChange={(event) =>
            updateControlLayout(control.id, {
              width: Math.min(
                sizeLimits.maxWidth,
                Math.max(sizeLimits.minWidth, Number(event.target.value) || sizeLimits.minWidth),
              ),
            })
          }
        />
        <TextField
          label="Height"
          size="small"
          type="number"
          fullWidth
          slotProps={{
            htmlInput: { min: sizeLimits.minHeight, max: sizeLimits.maxHeight, step: 16 },
          }}
          value={control.layout.height ?? controlLayoutHeight(control)}
          onChange={(event) =>
            updateControlLayout(control.id, {
              height: Math.min(
                sizeLimits.maxHeight,
                Math.max(sizeLimits.minHeight, Number(event.target.value) || sizeLimits.minHeight),
              ),
            })
          }
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label="X"
          size="small"
          type="number"
          fullWidth
          value={control.layout.x}
          onChange={(event) =>
            updateControlLayout(control.id, {
              x: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          fullWidth
          value={control.layout.y}
          onChange={(event) =>
            updateControlLayout(control.id, {
              y: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
      </Stack>
    </Stack>
  );
}

function OscSection({ control }: { control: Control }) {
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);
  const usesOsc = control.protocol === "osc" || control.protocol === "both";

  if (!usesOsc) {
    return (
      <Stack spacing={2}>
        <SectionIntro
          title="OSC"
          description="Assign global senders and receivers from I/O settings."
        />
        <UnusedSection message="This widget is not configured for OSC output. Change output to OSC or Both in General." />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title="OSC"
        description="Pick endpoints and set the message address."
      />

      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-sender-label">Sender</InputLabel>
        <Select
          labelId="control-osc-sender-label"
          label="Sender"
          value={control.oscSenderId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscSenderId: event.target.value || null,
            })
          }
        >
          {performerIo.oscSenders.length === 0 && (
            <MenuItem value="" disabled>
              Add senders in I/O settings
            </MenuItem>
          )}
          {performerIo.oscSenders.map((sender) => (
            <MenuItem key={sender.id} value={sender.id}>
              {endpointLabel(sender.name, `${sender.host}:${sender.port}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-receiver-label">Receiver</InputLabel>
        <Select
          labelId="control-osc-receiver-label"
          label="Receiver"
          value={control.oscReceiverId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscReceiverId: event.target.value || null,
            })
          }
        >
          <MenuItem value="">Any receiver</MenuItem>
          {performerIo.oscReceivers.map((receiver) => (
            <MenuItem key={receiver.id} value={receiver.id}>
              {endpointLabel(receiver.name, `port ${receiver.port}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Address"
        size="small"
        fullWidth
        value={control.osc.address}
        onChange={(event) =>
          updateControl(control.id, {
            osc: { ...control.osc, address: event.target.value },
          })
        }
      />
    </Stack>
  );
}

function MidiMappingFields({ control }: { control: Control }) {
  const updateControl = useAppStore((state) => state.updateControl);

  if (control.type === "button") {
    return (
      <TextField
        label="Note"
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
          label="Start note"
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
            label="Octaves"
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
            label="Velocity"
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
          label="CC X"
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
          label="CC Y"
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
      label="CC"
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

function MidiSection({ control }: { control: Control }) {
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);
  const usesMidi = control.protocol === "midi" || control.protocol === "both";

  if (!usesMidi) {
    return (
      <Stack spacing={2}>
        <SectionIntro
          title="MIDI"
          description="Assign global ports from I/O settings."
        />
        <UnusedSection message="This widget is not configured for MIDI output. Change output to MIDI or Both in General." />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title="MIDI"
        description="Pick ports and set channel mapping."
      />

      <FormControl fullWidth size="small">
        <InputLabel id="control-midi-output-label">Output</InputLabel>
        <Select
          labelId="control-midi-output-label"
          label="Output"
          value={control.midiOutputId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              midiOutputId: event.target.value || null,
            })
          }
        >
          {performerIo.midiOutputs.length === 0 && (
            <MenuItem value="" disabled>
              Add outputs in I/O settings
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
        <InputLabel id="control-midi-input-label">Input</InputLabel>
        <Select
          labelId="control-midi-input-label"
          label="Input"
          value={control.midiInputId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              midiInputId: event.target.value || null,
            })
          }
        >
          <MenuItem value="">Any input</MenuItem>
          {performerIo.midiInputs.map((endpoint) => (
            <MenuItem key={endpoint.id} value={endpoint.id}>
              {endpointLabel(endpoint.name, endpoint.portName)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Channel"
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
    </Stack>
  );
}

function ControlInspector({ control }: { control: Control }) {
  const [section, setSection] = useState<InspectorSection>("general");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}
    >
      <SettingsSectionNav
        sections={SECTIONS}
        section={section}
        onSelect={setSection}
        sidebarWidth={148}
      />
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", px: { xs: 2, sm: 2.5 }, py: 2 }}>
        {section === "general" && <GeneralSection control={control} />}
        {section === "layout" && <LayoutSection control={control} />}
        {section === "osc" && <OscSection control={control} />}
        {section === "midi" && <MidiSection control={control} />}
      </Box>
    </Box>
  );
}

export function ControlPerformerDialog() {
  const mode = useAppStore((state) => state.mode);
  const controls = useAppStore((state) => state.controls);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const selectControl = useAppStore((state) => state.selectControl);
  const removeControl = useAppStore((state) => state.removeControl);
  const selectedControl =
    controls.find((control) => control.id === selectedControlId) ?? null;
  const open = mode === "edit" && selectedControl !== null;

  const handleClose = () => {
    selectControl(null);
  };

  const handleDelete = () => {
    if (!selectedControl) {
      return;
    }

    removeControl(selectedControl.id);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            height: { xs: "90vh", sm: 520 },
            maxHeight: "90vh",
          },
        },
      }}
    >
      <ThemeProvider theme={settingsTheme}>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "baseline" },
              justifyContent: "space-between",
              gap: { xs: 0.25, sm: 2 },
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <Typography variant="h6" component="h2" noWrap sx={{ maxWidth: "100%" }}>
              {selectedControl?.label ?? "Widget"}
            </Typography>
            {selectedControl && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                {controlTypeLabel(selectedControl.type)}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            {selectedControl && <ControlInspector control={selectedControl} key={selectedControl.id} />}
          </Box>

          <DialogActions
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Button
              color="error"
              size="small"
              startIcon={<DeleteOutlinedIcon />}
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleClose} variant="contained" size="small">
              Done
            </Button>
          </DialogActions>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}
