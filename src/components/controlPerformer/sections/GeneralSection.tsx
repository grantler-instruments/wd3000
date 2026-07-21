import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Box,
  Button,
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
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../../store/useAppStore";
import {
  CONTROL_COLOR_PRESETS,
  type ControlTab,
  type ControlType,
  controlTabs,
  isValidControlColor,
  type SliderOrientation,
} from "../../../types";
import { ColorSwatch, type InspectorSectionProps, SectionIntro } from "../shared";

export function GeneralSection({ control, compact = false }: InspectorSectionProps) {
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
