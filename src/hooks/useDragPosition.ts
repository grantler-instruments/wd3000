import { useCallback, useEffect, useRef, useState } from "react";
import { snapToGrid } from "../types";

interface UseDragPositionOptions {
  enabled: boolean;
  x: number;
  y: number;
  gridSize: number;
  onCommit: (x: number, y: number) => void;
}

export function useDragPosition({ enabled, x, y, gridSize, onCommit }: UseDragPositionOptions) {
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x, y });
  const origin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const positionRef = useRef(position);
  positionRef.current = position;

  useEffect(() => {
    if (!dragging) {
      setPosition({ x, y });
    }
  }, [dragging, x, y]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - origin.current.pointerX;
      const deltaY = event.clientY - origin.current.pointerY;

      setPosition({
        x: Math.max(0, snapToGrid(origin.current.x + deltaX, gridSize)),
        y: Math.max(0, snapToGrid(origin.current.y + deltaY, gridSize)),
      });
    };

    const handlePointerUp = () => {
      setDragging(false);
      onCommit(positionRef.current.x, positionRef.current.y);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, gridSize, onCommit]);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      origin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: positionRef.current.x,
        y: positionRef.current.y,
      };
      setDragging(true);
    },
    [enabled],
  );

  return {
    position,
    dragging,
    startDrag,
  };
}
