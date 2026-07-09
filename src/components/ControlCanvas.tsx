import {
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddControlMenu } from "./AddControlMenu";
import { AddWidgetMenu } from "./AddWidgetMenu";
import { ControlWidgetMenu } from "./ControlWidgetMenu";
import { useDragPosition } from "../hooks/useDragPosition";
import { useViewportSize } from "../hooks/useViewportSize";
import { useWidgetContextMenu } from "../hooks/useWidgetContextMenu";
import {
  assignControlToHoveredTab,
  endControlDrag,
  resolveDroppedControlId,
  assignDraggedControlToHoveredTab,
  resolveTabDropAtPoint,
  setTabDropHover,
  dropPositionInElement,
} from "../lib/controlDrag";
import { ControlType, topLevelControls } from "../types";
import { useAppStore } from "../store/useAppStore";
import { ResizableControlFrame } from "./ResizableControlFrame";

interface ControlCanvasProps {
  editable: boolean;
}

function useCanvasContextMenu(editable: boolean, gridSize: number) {
  const addControl = useAppStore((state) => state.addControl);
  const pasteControl = useAppStore((state) => state.pasteControl);
  const controlClipboard = useAppStore((state) => state.controlClipboard);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number } | null>(null);
  const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!editable) {
        return;
      }

      if ((event.target as HTMLElement).closest("[data-control-frame]")) {
        return;
      }

      event.preventDefault();

      const canvas = canvasRef.current;
      contextMenuPositionRef.current = canvas
        ? dropPositionInElement(event.clientX, event.clientY, canvas, gridSize)
        : null;

      setContextMenu({ top: event.clientY, left: event.clientX });
    },
    [editable, gridSize],
  );

  const handleAddFromContextMenu = useCallback(
    (type: ControlType) => {
      addControl(type, contextMenuPositionRef.current ?? undefined);
      contextMenuPositionRef.current = null;
    },
    [addControl],
  );

  const handlePasteFromContextMenu = useCallback(() => {
    pasteControl(contextMenuPositionRef.current ?? undefined);
    contextMenuPositionRef.current = null;
  }, [pasteControl]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    contextMenuPositionRef.current = null;
  }, []);

  return {
    canvasRef,
    contextMenu,
    canPaste: controlClipboard !== null,
    handleContextMenu,
    handleAddFromContextMenu,
    handlePasteFromContextMenu,
    closeContextMenu,
  };
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
  onContextMenu,
}: {
  control: ReturnType<typeof topLevelControls>[number];
  editable: boolean;
  gridSize: number;
  canvasSize: { width: number; height: number };
  onContextMenu: (event: React.MouseEvent<HTMLElement>, controlId: string) => void;
}) {
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const draggingControlId = useAppStore((state) => state.draggingControlId);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const selected = editable && selectedControlId === control.id;

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
      onContextMenu={(event) => onContextMenu(event, control.id)}
      sx={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: dragging || selected ? 2 : 1,
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

function FreeLayoutCanvas({
  editable,
  gridSize,
  canvasRef,
  onContextMenu,
  onWidgetContextMenu,
}: {
  editable: boolean;
  gridSize: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onWidgetContextMenu: (event: React.MouseEvent<HTMLElement>, controlId: string) => void;
}) {
  const controls = useAppStore((state) => state.controls);
  const selectControl = useAppStore((state) => state.selectControl);
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
        ref={canvasRef}
        onContextMenu={onContextMenu}
        onPointerDown={(event) => {
          if (!editable || event.button !== 0) {
            return;
          }

          if (event.target === event.currentTarget) {
            selectControl(null);
          }
        }}
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
            onContextMenu={onWidgetContextMenu}
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
  const {
    canvasRef,
    contextMenu,
    canPaste,
    handleContextMenu,
    handleAddFromContextMenu,
    handlePasteFromContextMenu,
    closeContextMenu,
  } = useCanvasContextMenu(editable, gridSize);
  const {
    menu: widgetMenu,
    handleWidgetContextMenu,
    closeMenu: closeWidgetMenu,
  } = useWidgetContextMenu(editable);

  const handleCanvasContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      closeWidgetMenu();
      handleContextMenu(event);
    },
    [closeWidgetMenu, handleContextMenu],
  );

  const handleWidgetContextMenuWithClose = useCallback(
    (event: React.MouseEvent<HTMLElement>, controlId: string) => {
      closeContextMenu();
      handleWidgetContextMenu(event, controlId);
    },
    [closeContextMenu, handleWidgetContextMenu],
  );

  if (!hasTopLevelControls) {
    return (
      <>
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
          onContextMenu={handleCanvasContextMenu}
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
        <AddWidgetMenu
          id="canvas-context-menu"
          open={contextMenu !== null}
          onClose={closeContextMenu}
          onAdd={handleAddFromContextMenu}
          onPaste={handlePasteFromContextMenu}
          canPaste={canPaste}
          anchorPosition={contextMenu ?? undefined}
        />
        <ControlWidgetMenu
          open={widgetMenu !== null}
          onClose={closeWidgetMenu}
          controlId={widgetMenu?.controlId ?? null}
          anchorPosition={widgetMenu ?? undefined}
        />
      </>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
      <FreeLayoutCanvas
        editable={editable}
        gridSize={gridSize}
        canvasRef={canvasRef}
        onContextMenu={handleCanvasContextMenu}
        onWidgetContextMenu={handleWidgetContextMenuWithClose}
      />
      <AddWidgetMenu
        id="canvas-context-menu"
        open={contextMenu !== null}
        onClose={closeContextMenu}
        onAdd={handleAddFromContextMenu}
        onPaste={handlePasteFromContextMenu}
        canPaste={canPaste}
        anchorPosition={contextMenu ?? undefined}
      />
      <ControlWidgetMenu
        open={widgetMenu !== null}
        onClose={closeWidgetMenu}
        controlId={widgetMenu?.controlId ?? null}
        anchorPosition={widgetMenu ?? undefined}
      />
    </Box>
  );
}
