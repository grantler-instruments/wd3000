import {
  Box,
  Button,
  Chip,
  Paper,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { sendButtonValue, sendSliderValue } from "../lib/output";
import {
  Control,
  controlMappingLabel,
  controlProtocolLabel,
} from "../types";
import { useAppStore } from "../store/useAppStore";
import { KeyboardWidget } from "./KeyboardWidget";
import { PadWidget } from "./PadWidget";
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
  const performerIo = useAppStore((state) => state.performerIo);
  const setControlValue = useAppStore((state) => state.setControlValue);
  const setLastError = useAppStore((state) => state.setLastError);
  const sliderValue = useAppStore((state) => state.controlValues[control.id] ?? 0);
  const buttonPressed = sliderValue > 0;

  const handleButtonPress = async (pressed: boolean) => {
    if (editable) {
      return;
    }

    setControlValue(control.id, pressed ? 100 : 0);

    try {
      await sendButtonValue(control, performerIo, pressed);
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
              <Chip label={controlProtocolLabel(control.protocol)} size="small" />
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
            onMouseDown={(event) => {
              event.stopPropagation();
              void handleButtonPress(true);
            }}
            onMouseUp={(event) => {
              event.stopPropagation();
              void handleButtonPress(false);
            }}
            onMouseLeave={() => void handleButtonPress(false)}
            onTouchStart={(event) => {
              event.stopPropagation();
              void handleButtonPress(true);
            }}
            onTouchEnd={(event) => {
              event.stopPropagation();
              void handleButtonPress(false);
            }}
          >
            Trigger
          </Button>
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
            orientation={
              control.sliderOrientation === "vertical" ? "vertical" : "horizontal"
            }
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
