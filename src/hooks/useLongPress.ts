import { useCallback, useEffect, useRef } from "react";

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 10;

interface LongPressPoint {
  clientX: number;
  clientY: number;
}

/**
 * Touch/pen long-press handlers. Mouse is ignored (right-click / contextmenu covers desktop).
 */
export function useLongPress(onLongPress: ((point: LongPressPoint) => void) | null) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<LongPressPoint | null>(null);
  const firedRef = useRef(false);
  const teardownRef = useRef<(() => void) | null>(null);
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const clearPress = useCallback(() => {
    teardownRef.current?.();
    teardownRef.current = null;
  }, []);

  useEffect(() => () => clearPress(), [clearPress]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!onLongPress || event.button !== 0 || event.pointerType === "mouse") {
        return;
      }

      clearPress();
      firedRef.current = false;
      startRef.current = { clientX: event.clientX, clientY: event.clientY };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const start = startRef.current;
        if (!start) {
          return;
        }

        const dx = moveEvent.clientX - start.clientX;
        const dy = moveEvent.clientY - start.clientY;
        if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
          clearPress();
        }
      };

      const handlePointerUp = () => {
        clearPress();
      };

      const handlePointerCancel = () => {
        firedRef.current = false;
        clearPress();
      };

      const teardown = () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        startRef.current = null;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerCancel);
        teardownRef.current = null;
      };

      teardownRef.current = teardown;

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerCancel);

      timerRef.current = window.setTimeout(() => {
        const start = startRef.current;
        teardown();

        if (!start) {
          return;
        }

        firedRef.current = true;
        onLongPressRef.current?.(start);
      }, LONG_PRESS_MS);
    },
    [clearPress, onLongPress],
  );

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!firedRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    firedRef.current = false;
  }, []);

  if (!onLongPress) {
    return {};
  }

  return {
    onPointerDown,
    onClickCapture,
  };
}
