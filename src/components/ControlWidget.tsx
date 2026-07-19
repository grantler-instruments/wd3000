import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Slider,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { sendButtonValue, sendSliderValue } from "../lib/output";
import { useAppStore } from "../store/useAppStore";
import { type Control, controlActiveProtocolLabels, controlMappingLabel } from "../types";
import { KeyboardWidget } from "./KeyboardWidget";
import { PadWidget } from "./PadWidget";
import { RotaryWidget } from "./RotaryWidget";
import { TabsWidget } from "./TabsWidget";

interface ControlWidgetProps {
  control: Control;
  editable: boolean;
  layoutPreview?: boolean;
  hideLabel?: boolean;
}

export function ControlWidget({
  control,
  editable,
  layoutPreview = false,
  hideLabel = false,
}: ControlWidgetProps) {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const setControlValue = useAppStore((state) => state.setControlValue);
  const setLastError = useAppStore((state) => state.setLastError);
  const sliderValue = useAppStore((state) => state.controlValues[control.id] ?? 0);
  const buttonPressed = sliderValue > 0;
  const switchOn = sliderValue > 0;
  const buttonHeldRef = useRef(false);

  const handleButtonPress = async (pressed: boolean) => {
    if (editable) {
      return;
    }

    if (buttonHeldRef.current === pressed) {
      return;
    }
    buttonHeldRef.current = pressed;

    setControlValue(control.id, pressed ? 100 : 0);

    try {
      await sendButtonValue(control, performerIo, pressed);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSwitchChange = async (checked: boolean) => {
    setControlValue(control.id, checked ? 100 : 0);

    if (editable) {
      return;
    }

    try {
      await sendButtonValue(control, performerIo, checked);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSliderChange = async (_: Event, nextValue: number | number[]) => {
    const normalized = Array.isArray(nextValue) ? nextValue[0] : nextValue;
    setControlValue(control.id, normalized);

    if (editable) {
      return;
    }

    try {
      await sendSliderValue(control, performerIo, normalized / 100);
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const performance = !editable || layoutPreview;
  const showEditChrome = editable && !layoutPreview;
  const hideHeadline = hideLabel || (control.type === "tabs" && !editable);
  const accentColor = control.color ?? undefined;
  const accentSx = accentColor
    ? {
        bgcolor: accentColor,
        "&:hover": { bgcolor: accentColor, filter: "brightness(1.08)" },
      }
    : undefined;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: performance ? 2.5 : 2,
        height: "100%",
        overflow: "hidden",
        borderColor: accentColor ? `${accentColor}66` : "divider",
        borderWidth: 1,
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={performance ? 2 : 1.5} sx={{ height: "100%", minHeight: 0 }}>
        {!hideHeadline &&
          (showEditChrome ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
                {control.label}
              </Typography>
              {controlActiveProtocolLabels(control).map((label) => (
                <Chip key={label} label={label} size="small" variant="outlined" />
              ))}
            </Stack>
          ) : (
            <Typography variant="subtitle2" color="text.secondary">
              {control.label}
            </Typography>
          ))}

        {control.type === "button" ? (
          <Button
            variant="contained"
            fullWidth
            disabled={editable && !layoutPreview}
            sx={
              performance
                ? {
                    flex: 1,
                    ...(buttonPressed
                      ? {
                          filter: "brightness(0.92)",
                          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.25)",
                        }
                      : undefined),
                    ...accentSx,
                  }
                : accentSx
            }
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              // In edit mode, let the press bubble so long-press can open the widget menu.
              if (editable) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              void handleButtonPress(true);
            }}
            onPointerUp={(event) => {
              if (editable) {
                return;
              }
              event.stopPropagation();
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              void handleButtonPress(false);
            }}
            onPointerCancel={() => {
              if (!editable) {
                void handleButtonPress(false);
              }
            }}
          >
            {t("control.trigger")}
          </Button>
        ) : control.type === "switch" ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={switchOn}
                  disabled={editable && !layoutPreview}
                  onChange={(_, checked) => {
                    void handleSwitchChange(checked);
                  }}
                  sx={
                    accentColor
                      ? {
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: accentColor,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: accentColor,
                          },
                        }
                      : undefined
                  }
                />
              }
              label={switchOn ? t("control.on") : t("control.off")}
              sx={{ m: 0 }}
            />
          </Box>
        ) : control.type === "keyboard" ? (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <KeyboardWidget
              control={control}
              editable={editable && !layoutPreview}
              accentColor={accentColor}
            />
          </Box>
        ) : control.type === "pad" ? (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <PadWidget
              control={control}
              editable={editable && !layoutPreview}
              accentColor={accentColor}
            />
          </Box>
        ) : control.type === "rotary" ? (
          <RotaryWidget
            control={control}
            editable={editable && !layoutPreview}
            accentColor={accentColor}
          />
        ) : control.type === "tabs" ? (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <TabsWidget
              control={control}
              sendOnChange={!editable}
              editable={editable}
              layoutPreview={layoutPreview}
              accentColor={accentColor}
            />
          </Box>
        ) : (
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            disabled={editable && !layoutPreview}
            orientation={control.sliderOrientation === "vertical" ? "vertical" : "horizontal"}
            valueLabelDisplay="auto"
            sx={{
              ...(accentColor ? { color: accentColor } : undefined),
              ...(control.sliderOrientation === "vertical"
                ? performance
                  ? { flex: 1, height: "100%", mx: "auto" }
                  : { height: 120, mx: "auto" }
                : performance
                  ? { flex: 1, my: 1 }
                  : undefined),
            }}
            onClick={(event) => event.stopPropagation()}
          />
        )}

        {showEditChrome && (
          <Typography variant="caption" color="text.secondary">
            {controlMappingLabel(control, performerIo)}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
