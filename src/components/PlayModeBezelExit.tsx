import { Box } from "@mui/material";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAppPlatform } from "../lib/platform";

const HOT_ZONE_SIZE = 56;
const MIN_EXIT_DISTANCE = 72;
const MIN_HORIZONTAL_PULL = 36;
const MIN_VERTICAL_PULL = 36;

interface PlayModeBezelExitProps {
  onExit: () => void;
}

export function PlayModeBezelExit({ onExit }: PlayModeBezelExitProps) {
  const { t } = useTranslation();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    origin.current = null;
    setDragOffset(null);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    origin.current = { x: event.clientX, y: event.clientY };
    setDragOffset({ x: 0, y: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!origin.current) {
      return;
    }

    setDragOffset({
      x: event.clientX - origin.current.x,
      y: event.clientY - origin.current.y,
    });
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!origin.current) {
        return;
      }

      const deltaX = event.clientX - origin.current.x;
      const deltaY = event.clientY - origin.current.y;
      const distance = Math.hypot(deltaX, deltaY);

      reset();

      if (
        distance >= MIN_EXIT_DISTANCE &&
        deltaX <= -MIN_HORIZONTAL_PULL &&
        deltaY >= MIN_VERTICAL_PULL
      ) {
        onExit();
      }
    },
    [onExit, reset],
  );

  if (getAppPlatform() !== "mobile") {
    return null;
  }

  const dragProgress =
    dragOffset === null
      ? 0
      : Math.min(1, Math.hypot(dragOffset.x, dragOffset.y) / MIN_EXIT_DISTANCE);

  return (
    <Box
      aria-label={t("control.swipeExit")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={reset}
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        width: HOT_ZONE_SIZE,
        height: HOT_ZONE_SIZE,
        pt: "env(safe-area-inset-top)",
        pr: "env(safe-area-inset-right)",
        touchAction: "none",
        zIndex: 1300,
        boxSizing: "content-box",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "calc(10px + env(safe-area-inset-top))",
          right: "calc(10px + env(safe-area-inset-right))",
          width: 18,
          height: 18,
          borderTop: 2,
          borderRight: 2,
          borderColor: "text.secondary",
          opacity: dragProgress > 0 ? 0.9 : 0.35,
          transform: `scale(${1 + dragProgress * 0.15})`,
          transition: dragProgress > 0 ? "none" : "opacity 0.2s, transform 0.2s",
          pointerEvents: "none",
        }}
      />
      {dragOffset && dragProgress > 0.1 && (
        <Box
          sx={{
            position: "absolute",
            top: "calc(18px + env(safe-area-inset-top))",
            right: "calc(18px + env(safe-area-inset-right))",
            width: Math.min(Math.abs(dragOffset.x), 96),
            height: 2,
            bgcolor: "primary.main",
            opacity: 0.7,
            transformOrigin: "top right",
            transform: `rotate(${Math.atan2(dragOffset.y, -dragOffset.x)}rad)`,
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
