import { useCallback, useEffect, useRef, useState } from "react";
import { snapToGrid } from "../types";

interface UseResizeControlOptions {
  enabled: boolean;
  width: number;
  height: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  gridSize: number;
  onCommit: (width: number, height: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useResizeControl({
  enabled,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  gridSize,
  onCommit,
}: UseResizeControlOptions) {
  const [resizing, setResizing] = useState(false);
  const [size, setSize] = useState({ width, height });
  const origin = useRef({ pointerX: 0, pointerY: 0, width: 0, height: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    if (!resizing) {
      setSize({ width, height });
    }
  }, [height, resizing, width]);

  useEffect(() => {
    if (!resizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - origin.current.pointerX;
      const deltaY = event.clientY - origin.current.pointerY;

      setSize({
        width: clamp(
          snapToGrid(origin.current.width + deltaX, gridSize),
          minWidth,
          maxWidth,
        ),
        height: clamp(
          snapToGrid(origin.current.height + deltaY, gridSize),
          minHeight,
          maxHeight,
        ),
      });
    };

    const handlePointerUp = () => {
      setResizing(false);
      onCommit(sizeRef.current.width, sizeRef.current.height);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gridSize, maxHeight, maxWidth, minHeight, minWidth, onCommit, resizing]);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      origin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      };
      setResizing(true);
    },
    [enabled],
  );

  return {
    size,
    resizing,
    startResize,
  };
}
