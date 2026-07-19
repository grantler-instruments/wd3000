import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewportSize } from "../hooks/useViewportSize";
import { useAppStore } from "../store/useAppStore";
import { settingsTheme } from "../theme";
import {
  CONTROL_COLOR_PRESETS,
  type Control,
  type ControlTab,
  type ControlType,
  controlCanvasSizeLimits,
  controlLayoutHeight,
  controlTabs,
  endpointLabel,
  isValidControlColor,
  KEYBOARD_DEFAULT_OCTAVES,
  KEYBOARD_DEFAULT_VELOCITY,
  KEYBOARD_MAX_OCTAVES,
  KEYBOARD_MIN_OCTAVES,
  type SliderOrientation,
} from "../types";
import { AppDialogHeader } from "./AppDialogHeader";
import { SettingsSectionNav } from "./SettingsSectionNav";
import { stackedAccordionSx } from "./stackedAccordionSx";

type InspectorSection = "general" | "layout" | "osc" | "midi" | "mqtt";

function SectionIntro({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
    );
  }

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

function ProtocolEnableSection({
  label,
  enabled,
  onToggle,
  description,
  children,
  compact = false,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Stack spacing={enabled ? 2.5 : 0}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: compact ? "center" : "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {!compact && (
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {label}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Switch
          checked={enabled}
          onChange={(_, checked) => onToggle(checked)}
          aria-label={
            enabled ? t("sensors.disableNamed", { label }) : t("sensors.enableNamed", { label })
          }
          sx={{ flexShrink: 0, mt: compact ? 0 : 0.25 }}
        />
      </Stack>
      {enabled ? <Stack spacing={2.5}>{children}</Stack> : null}
    </Stack>
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

function GeneralSection({ control, compact = false }: { control: Control; compact?: boolean }) {
  const { t } = useTranslation();
  const controls = useAppStore((state) => state.controls);
  const updateControl = useAppStore((state) => state.updateControl);
  const assignControlToTab = useAppStore((state) => state.assignControlToTab);
  const removeTabChildren = useAppStore((state) => state.removeTabChildren);

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title={t("control.general")}
        description={t("control.generalDescription")}
        compact={compact}
      />

      <TextField
        label={t("common.label")}
        size="small"
        fullWidth
        value={control.label}
        onChange={(event) => updateControl(control.id, { label: event.target.value })}
      />

      <FormControl fullWidth size="small">
        <InputLabel id="control-type-label">{t("common.type")}</InputLabel>
        <Select
          labelId="control-type-label"
          label={t("common.type")}
          value={control.type}
          onChange={(event) =>
            updateControl(control.id, { type: event.target.value as ControlType })
          }
        >
          <MenuItem value="button">{t("controlTypes.button")}</MenuItem>
          <MenuItem value="switch">{t("controlTypes.switch")}</MenuItem>
          <MenuItem value="slider">{t("controlTypes.slider")}</MenuItem>
          <MenuItem value="rotary">{t("controlTypes.rotary")}</MenuItem>
          <MenuItem value="keyboard">{t("controlTypes.keyboard")}</MenuItem>
          <MenuItem value="pad">{t("controlTypes.pad")}</MenuItem>
          <MenuItem value="tabs">{t("controlTypes.tabs")}</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {t("common.color")}
        </Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
          <ColorSwatch
            label={t("control.defaultThemeColor")}
            selected={!control.color}
            onClick={() => updateControl(control.id, { color: null })}
          />
          {CONTROL_COLOR_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              label={t("control.setColorTo", { color })}
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
                control.color && isValidControlColor(control.color) ? control.color : "#2196f3"
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
          <InputLabel id="slider-orientation-label">{t("control.orientation")}</InputLabel>
          <Select
            labelId="slider-orientation-label"
            label={t("control.orientation")}
            value={control.sliderOrientation ?? "horizontal"}
            onChange={(event) =>
              updateControl(control.id, {
                sliderOrientation: event.target.value as SliderOrientation,
              })
            }
          >
            <MenuItem value="horizontal">{t("control.horizontal")}</MenuItem>
            <MenuItem value="vertical">{t("control.vertical")}</MenuItem>
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
            <Typography variant="subtitle2">{t("controlTypes.tabs")}</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                const tabs = controlTabs(control);
                const nextTab: ControlTab = {
                  id: crypto.randomUUID(),
                  label: t("control.tabN", { n: tabs.length + 1 }),
                };
                updateControl(control.id, { tabs: [...tabs, nextTab] });
              }}
            >
              {t("control.addTab")}
            </Button>
          </Stack>
          <Stack spacing={1}>
            {controlTabs(control).map((tab, index) => (
              <Paper key={tab.id} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label={t("control.tabN", { n: index + 1 })}
                    size="small"
                    fullWidth
                    value={tab.label}
                    onChange={(event) => {
                      const tabs = controlTabs(control).map((entry) =>
                        entry.id === tab.id ? { ...entry, label: event.target.value } : entry,
                      );
                      updateControl(control.id, { tabs });
                    }}
                  />
                  <IconButton
                    aria-label={t("control.removeTab", { n: index + 1 })}
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
            {t("control.placement")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("control.insideTabs", {
              label:
                controls.find((entry) => entry.id === control.parentId)?.label ??
                t("control.tabsWidget"),
            })}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => assignControlToTab(control.id, null, null)}
          >
            {t("control.moveToCanvas")}
          </Button>
        </Paper>
      )}
    </Stack>
  );
}

function LayoutSection({ control, compact = false }: { control: Control; compact?: boolean }) {
  const { t } = useTranslation();
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
        title={t("control.layout")}
        description={t("control.layoutDescription")}
        compact={compact}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label={t("common.width")}
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
          label={t("common.height")}
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

function OscSection({ control, compact = false }: { control: Control; compact?: boolean }) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);

  return (
    <ProtocolEnableSection
      label={t("protocols.osc")}
      enabled={control.osc.enabled}
      description={control.osc.enabled ? t("control.oscPick") : t("control.oscAssign")}
      compact={compact}
      onToggle={(enabled) =>
        updateControl(control.id, {
          osc: { ...control.osc, enabled },
          oscSenderId: enabled
            ? (control.oscSenderId ?? performerIo.oscSenders[0]?.id ?? null)
            : control.oscSenderId,
        })
      }
    >
      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-sender-label">{t("control.sender")}</InputLabel>
        <Select
          labelId="control-osc-sender-label"
          label={t("control.sender")}
          value={control.oscSenderId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscSenderId: event.target.value || null,
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

      <FormControl fullWidth size="small">
        <InputLabel id="control-osc-receiver-label">{t("control.receiver")}</InputLabel>
        <Select
          labelId="control-osc-receiver-label"
          label={t("control.receiver")}
          value={control.oscReceiverId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              oscReceiverId: event.target.value || null,
            })
          }
        >
          <MenuItem value="">{t("control.anyReceiver")}</MenuItem>
          {performerIo.oscReceivers.map((receiver) => (
            <MenuItem key={receiver.id} value={receiver.id}>
              {endpointLabel(receiver.name, `port ${receiver.port}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("common.address")}
        size="small"
        fullWidth
        value={control.osc.address}
        onChange={(event) =>
          updateControl(control.id, {
            osc: { ...control.osc, address: event.target.value },
          })
        }
      />
    </ProtocolEnableSection>
  );
}

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

function MidiSection({ control, compact = false }: { control: Control; compact?: boolean }) {
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

function MqttSection({ control, compact = false }: { control: Control; compact?: boolean }) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const updateControl = useAppStore((state) => state.updateControl);

  return (
    <ProtocolEnableSection
      label={t("protocols.mqtt")}
      enabled={control.mqtt.enabled}
      description={control.mqtt.enabled ? t("control.mqttPick") : t("control.mqttAssign")}
      compact={compact}
      onToggle={(enabled) =>
        updateControl(control.id, {
          mqtt: { ...control.mqtt, enabled },
          mqttConnectionId: enabled
            ? (control.mqttConnectionId ?? performerIo.mqttConnections[0]?.id ?? null)
            : control.mqttConnectionId,
        })
      }
    >
      <FormControl fullWidth size="small">
        <InputLabel id="control-mqtt-connection-label">{t("common.broker")}</InputLabel>
        <Select
          labelId="control-mqtt-connection-label"
          label={t("common.broker")}
          value={control.mqttConnectionId ?? ""}
          onChange={(event) =>
            updateControl(control.id, {
              mqttConnectionId: event.target.value || null,
            })
          }
        >
          {performerIo.mqttConnections.length === 0 && (
            <MenuItem value="" disabled>
              {t("control.addBrokersInIo")}
            </MenuItem>
          )}
          {performerIo.mqttConnections.map((connection) => (
            <MenuItem key={connection.id} value={connection.id}>
              {endpointLabel(
                connection.name,
                `${connection.protocol.toUpperCase()} ${connection.host}:${connection.port}`,
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={t("common.topic")}
        size="small"
        fullWidth
        value={control.mqtt.topic}
        onChange={(event) =>
          updateControl(control.id, {
            mqtt: { ...control.mqtt, topic: event.target.value },
          })
        }
        slotProps={{
          htmlInput: {
            autoCapitalize: "off",
            autoCorrect: "off",
            spellCheck: "false",
          },
        }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <FormControl fullWidth size="small">
          <InputLabel id="control-mqtt-qos-label">{t("common.qos")}</InputLabel>
          <Select
            labelId="control-mqtt-qos-label"
            label={t("common.qos")}
            value={control.mqtt.qos}
            onChange={(event) =>
              updateControl(control.id, {
                mqtt: {
                  ...control.mqtt,
                  qos: Number(event.target.value) as Control["mqtt"]["qos"],
                },
              })
            }
          >
            <MenuItem value={0}>0</MenuItem>
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="control-mqtt-retain-label">{t("common.retain")}</InputLabel>
          <Select
            labelId="control-mqtt-retain-label"
            label={t("common.retain")}
            value={control.mqtt.retain ? "yes" : "no"}
            onChange={(event) =>
              updateControl(control.id, {
                mqtt: {
                  ...control.mqtt,
                  retain: event.target.value === "yes",
                },
              })
            }
          >
            <MenuItem value="no">{t("common.no")}</MenuItem>
            <MenuItem value="yes">{t("common.yes")}</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </ProtocolEnableSection>
  );
}

function InspectorSectionContent({
  section,
  control,
  compact = false,
}: {
  section: InspectorSection;
  control: Control;
  compact?: boolean;
}) {
  switch (section) {
    case "general":
      return <GeneralSection control={control} compact={compact} />;
    case "layout":
      return <LayoutSection control={control} compact={compact} />;
    case "osc":
      return <OscSection control={control} compact={compact} />;
    case "midi":
      return <MidiSection control={control} compact={compact} />;
    case "mqtt":
      return <MqttSection control={control} compact={compact} />;
  }
}

function ControlInspector({ control }: { control: Control }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [section, setSection] = useState<InspectorSection>("general");
  const [expanded, setExpanded] = useState<InspectorSection | false>("general");

  const sections: { id: InspectorSection; label: string }[] = [
    { id: "general", label: t("control.general") },
    { id: "layout", label: t("control.layout") },
    { id: "osc", label: t("protocols.osc") },
    { id: "midi", label: t("protocols.midi") },
    { id: "mqtt", label: t("protocols.mqtt") },
  ];

  if (isMobile) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "auto",
          px: 2,
          py: 1.5,
        }}
      >
        <Stack spacing={1}>
          {sections.map((item) => (
            <Accordion
              key={item.id}
              expanded={expanded === item.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? item.id : false)}
              disableGutters
              elevation={0}
              sx={stackedAccordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">{item.label}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <InspectorSectionContent section={item.id} control={control} compact />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}
    >
      <SettingsSectionNav
        sections={sections}
        section={section}
        onSelect={setSection}
        sidebarWidth={148}
      />
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", px: 2.5, py: 2 }}>
        <InspectorSectionContent section={section} control={control} />
      </Box>
    </Box>
  );
}

export function ControlPerformerDialog() {
  const { t } = useTranslation();
  const mode = useAppStore((state) => state.mode);
  const controls = useAppStore((state) => state.controls);
  const inspectorControlId = useAppStore((state) => state.inspectorControlId);
  const closeControlInspector = useAppStore((state) => state.closeControlInspector);
  const removeControl = useAppStore((state) => state.removeControl);
  const selectedControl = controls.find((control) => control.id === inspectorControlId) ?? null;
  const open = mode === "edit" && selectedControl !== null;

  const handleClose = () => {
    closeControlInspector();
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
          <AppDialogHeader
            title={selectedControl?.label ?? t("control.widget")}
            onClose={handleClose}
            subtitle={
              selectedControl ? (
                <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                  {t(`controlTypes.${selectedControl.type}`)}
                </Typography>
              ) : undefined
            }
          />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            {selectedControl && (
              <ControlInspector control={selectedControl} key={selectedControl.id} />
            )}
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
              {t("common.delete")}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleClose} variant="contained" size="small">
              {t("common.done")}
            </Button>
          </DialogActions>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}
