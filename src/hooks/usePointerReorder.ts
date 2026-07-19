import { useCallback, useEffect, useRef, useState } from "react";

export function usePointerReorder(onReorder: (sourceId: string, targetId: string) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const overIdRef = useRef<string | null>(null);
  const onReorderRef = useRef(onReorder);

  onReorderRef.current = onReorder;

  useEffect(() => {
    draggingIdRef.current = draggingId;
  }, [draggingId]);

  useEffect(() => {
    overIdRef.current = overId;
  }, [overId]);

  useEffect(() => {
    if (!draggingId) {
      return;
    }

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const findRowAt = (clientY: number) => {
      const rows = document.querySelectorAll("[data-reorder-id]");
      for (const row of rows) {
        const id = row.getAttribute("data-reorder-id");
        if (!id || id === draggingIdRef.current) {
          continue;
        }

        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          return id;
        }
      }

      return null;
    };

    const handleMove = (event: PointerEvent) => {
      const id = findRowAt(event.clientY);
      if (id) {
        setOverId(id);
      }
    };

    const finish = () => {
      const sourceId = draggingIdRef.current;
      const targetId = overIdRef.current;
      if (sourceId && targetId && sourceId !== targetId) {
        onReorderRef.current(sourceId, targetId);
      }
      setDraggingId(null);
      setOverId(null);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [draggingId]);

  const startDrag = useCallback((id: string) => {
    setDraggingId(id);
    setOverId(id);
  }, []);

  return { draggingId, overId, startDrag };
}
