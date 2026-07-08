import { Box } from "@mui/material";
import { useCallback, useRef } from "react";
import { sendPadValue } from "../lib/output";
import {
  Control,
  DEFAULT_CONTROL_PAD_VALUE,
} from "../types";
import { useAppStore } from "../store/useAppStore";

interface PadWidgetProps {
  control: Control;
  editable: boolean;
  accentColor?: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function pointerToPadValue(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const x = clamp01((clientX - rect.left) / rect.width);
  const y = clamp01(1 - (clientY - rect.top) / rect.height);
  return {
    x: Math.round(x * 100),
    y: Math.round(y * 100),
  };
}

export function PadWidget({
  control,
  editable,
  accentColor,
}: PadWidgetProps) {
  const performerIo = useAppStore((state) => state.performerIo);
  const padValue = useAppStore(
    (state) => state.controlPadValues[control.id] ?? DEFAULT_CONTROL_PAD_VALUE,
  );
  const setControlPadValue = useAppStore((state) => state.setControlPadValue);
  const setLastError = useAppStore((state) => state.setLastError);
  const padRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const updatePad = useCallback(
    async (x: number, y: number) => {
      setControlPadValue(control.id, x, y);

      if (editable) {
        return;
      }

      try {
        await sendPadValue(control, performerIo, x / 100, y / 100);
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      }
    },
    [control, editable, performerIo, setControlPadValue, setLastError],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    if (editable || !padRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    const next = pointerToPadValue(
      padRef.current.getBoundingClientRect(),
      event.clientX,
      event.clientY,
    );
    void updatePad(next.x, next.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (editable || !dragging.current || !padRef.current) {
      return;
    }

    const next = pointerToPadValue(
      padRef.current.getBoundingClientRect(),
      event.clientX,
      event.clientY,
    );
    void updatePad(next.x, next.y);
  };

  const handlePointerEnd = () => {
    dragging.current = false;
  };

  const indicatorColor = accentColor ?? "primary.main";

  return (
    <Box
      ref={padRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onClick={(event) => event.stopPropagation()}
      sx={{
        position: "relative",
        flex: 1,
        width: "100%",
        minHeight: 0,
        borderRadius: 1,
        border: 2,
        borderColor: "secondary.main",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        opacity: editable ? 0.72 : 1,
        bgcolor: "background.default",
        boxSizing: "border-box",
        cursor: editable ? "default" : "crosshair",
        backgroundImage: (theme) =>
          `linear-gradient(to right, ${theme.palette.divider} 1px, transparent 1px),
           linear-gradient(to bottom, ${theme.palette.divider} 1px, transparent 1px)`,
        backgroundSize: "25% 25%",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: `${padValue.x}%`,
          bottom: `${padValue.y}%`,
          width: 20,
          height: 20,
          transform: "translate(-50%, 50%)",
          borderRadius: "50%",
          bgcolor: indicatorColor,
          border: 2,
          borderColor: "background.paper",
          boxShadow: 2,
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}
