import { Knob } from "@grantler-instruments/mui-theme";
import { Box } from "@mui/material";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { sendSliderValue } from "../lib/output";
import { useAppStore } from "../store/useAppStore";
import type { Control } from "../types";

interface RotaryWidgetProps {
  control: Control;
  editable: boolean;
  accentColor?: string;
}

export function RotaryWidget({ control, editable, accentColor }: RotaryWidgetProps) {
  const theme = useTheme();
  const performerIo = useAppStore((state) => state.performerIo);
  const value = useAppStore((state) => state.controlValues[control.id] ?? 0);
  const setControlValue = useAppStore((state) => state.setControlValue);
  const setLastError = useAppStore((state) => state.setLastError);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(96);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize(Math.max(56, Math.min(140, Math.floor(Math.min(width, height) - 8))));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleChange = (nextValue: number) => {
    setControlValue(control.id, nextValue);

    if (editable) {
      return;
    }

    void (async () => {
      try {
        await sendSliderValue(control, performerIo, nextValue / 100);
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    })();
  };

  const knobTheme = accentColor
    ? createTheme(theme, {
        palette: {
          primary: {
            main: accentColor,
          },
        },
      })
    : theme;

  return (
    <Box
      ref={containerRef}
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
      <ThemeProvider theme={knobTheme}>
        <Knob
          value={value}
          onChange={handleChange}
          min={0}
          max={100}
          step={1}
          size={size}
          disabled={editable}
          color="primary"
          formatValue={(next) => `${Math.round(next)}`}
        />
      </ThemeProvider>
    </Box>
  );
}
