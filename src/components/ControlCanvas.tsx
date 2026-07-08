import {
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { AddControlMenu } from "./AddControlMenu";
import { useDragPosition } from "../hooks/useDragPosition";
import { useViewportSize } from "../hooks/useViewportSize";
import {
  assignControlToHoveredTab,
  endControlDrag,
  resolveDroppedControlId,
  assignDraggedControlToHoveredTab,
  resolveTabDropAtPoint,
  setTabDropHover,
} from "../lib/controlDrag";
import { topLevelControls } from "../types";
import { useAppStore } from "../store/useAppStore";
import { ResizableControlFrame } from "./ResizableControlFrame";

interface ControlCanvasProps {
  editable: boolean;
}

function useCanvasDropHandlers(editable: boolean) {
  const assignControlToTab = useAppStore((state) => state.assignControlToTab);
  const [dragOverCanvas, setDragOverCanvas] = useState(false);

  const handleCanvasDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!editable) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverCanvas(true);
    },
    [editable],
  );

  const handleCanvasDragLeave = useCallback(() => {
    setDragOverCanvas(false);
  }, []);

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!editable) {
        return;
      }

      event.preventDefault();
      setDragOverCanvas(false);

      const sourceId = resolveDroppedControlId(event.dataTransfer);
      if (sourceId) {
        assignControlToTab(sourceId, null, null);
      }
      endControlDrag();
    },
    [assignControlToTab, editable],
  );

  return {
    dragOverCanvas,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
  };
}

function ControlItem({
  control,
  editable,
  gridSize,
  canvasSize,
}: {
  control: ReturnType<typeof topLevelControls>[number];
  editable: boolean;
  gridSize: number;
  canvasSize: { width: number; height: number };
}) {
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const draggingControlId = useAppStore((state) => state.draggingControlId);

  const handleCommit = useCallback(
    (x: number, y: number) => {
      const tabsControlId = useAppStore.getState().dragHoverTabsId;
      if (tabsControlId && assignControlToHoveredTab(control.id, tabsControlId)) {
        setTabDropHover(null);
        return;
      }

      setTabDropHover(null);
      updateControlLayout(control.id, { x, y });
    },
    [control.id, updateControlLayout],
  );

  const { position, dragging, startDrag } = useDragPosition({
    enabled: editable,
    x: control.layout.x,
    y: control.layout.y,
    gridSize,
    onCommit: handleCommit,
  });

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const preview = resolveTabDropAtPoint(
        event.clientX,
        event.clientY,
        gridSize,
        control.id,
      );
      setTabDropHover(
        preview ? { ...preview, sourceControlId: control.id } : null,
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [dragging, gridSize]);

  const isCanvasDragging = draggingControlId === control.id;

  return (
    <Box
      data-control-frame={control.id}
      sx={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: dragging ? 2 : 1,
        opacity: dragging ? 0.92 : isCanvasDragging ? 0.35 : 1,
        pointerEvents: dragging ? "none" : "auto",
      }}
    >
      <ResizableControlFrame
        control={control}
        editable={editable}
        layoutPreview={editable}
        gridSize={gridSize}
        canvasSize={canvasSize}
        subtractPosition
        showDragHandle={editable}
        onDragStart={startDrag}
        showCanvasDragHandle={editable}
      />
    </Box>
  );
}

function FreeLayoutCanvas({ editable, gridSize }: { editable: boolean; gridSize: number }) {
  const controls = useAppStore((state) => state.controls);
  const { width, height } = useViewportSize();
  const sortedControls = topLevelControls(controls);
  const {
    dragOverCanvas,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
  } = useCanvasDropHandlers(editable);

  useEffect(() => {
    if (!editable) {
      return;
    }

    const handleWindowDragEnd = () => {
      assignDraggedControlToHoveredTab();
      endControlDrag();
    };

    window.addEventListener("dragend", handleWindowDragEnd);
    return () => window.removeEventListener("dragend", handleWindowDragEnd);
  }, [editable]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: editable ? "auto" : "hidden",
        p: 0,
        bgcolor: "background.default",
      }}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      <Box
        sx={{
          position: "relative",
          width,
          height,
          minWidth: width,
          minHeight: height,
          flexShrink: 0,
          border: editable ? 1 : 0,
          borderColor: dragOverCanvas ? "primary.main" : "divider",
          bgcolor: "background.paper",
          boxSizing: "border-box",
          backgroundImage: editable
            ? `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`
            : "none",
          backgroundSize: editable ? `${gridSize}px ${gridSize}px` : "auto",
        }}
      >
        {sortedControls.map((control) => (
          <ControlItem
            key={control.id}
            control={control}
            editable={editable}
            gridSize={gridSize}
            canvasSize={{ width, height }}
          />
        ))}
      </Box>
    </Box>
  );
}

export function ControlCanvas({ editable }: ControlCanvasProps) {
  const controls = useAppStore((state) => state.controls);
  const gridSize = useAppStore((state) => state.layoutSettings.gridSize);
  const hasTopLevelControls = topLevelControls(controls).length > 0;

  if (!hasTopLevelControls) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          height: editable ? undefined : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: editable ? 4 : 0,
        }}
      >
        {editable ? (
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <Typography color="text.secondary">
              Add widgets to build your control surface.
            </Typography>
            <AddControlMenu />
          </Stack>
        ) : (
          <Typography color="text.secondary">
            Switch to edit mode to add controls.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
      <FreeLayoutCanvas editable={editable} gridSize={gridSize} />
    </Box>
  );
}
