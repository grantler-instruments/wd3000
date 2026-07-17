import { Box, Typography, alpha } from "@mui/material";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDragPosition } from "../hooks/useDragPosition";
import {
  assignControlToHoveredTab,
  dropPositionInElement,
  endControlDrag,
  resolveDroppedControlId,
  resolveTabDropAtPoint,
  setTabDropHover,
} from "../lib/controlDrag";
import {
  Control,
  ControlTab,
  LAYOUT_GRID_SIZE,
  controlLayoutHeight,
  tabChildControls,
  tabPanelContentSize,
} from "../types";
import { useAppStore } from "../store/useAppStore";
import { ControlWidgetMenu } from "./ControlWidgetMenu";
import { ResizableControlFrame } from "./ResizableControlFrame";
import { useWidgetContextMenu } from "../hooks/useWidgetContextMenu";

interface TabPanelContentProps {
  parentControl: Control;
  tab: ControlTab;
  active: boolean;
  editable: boolean;
  layoutPreview?: boolean;
  gridSize?: number;
}

function allowDrop(event: React.DragEvent<HTMLElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function DropPlacementPreview({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        border: 2,
        borderStyle: "dashed",
        borderColor: "primary.main",
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
        pointerEvents: "none",
        zIndex: 4,
        boxSizing: "border-box",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          left: 4,
          top: 4,
          px: 0.75,
          py: 0.25,
          borderRadius: 0.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {t("control.placeHere")}
      </Typography>
    </Box>
  );
}

function TabChildItem({
  control,
  parentControl,
  editable,
  layoutPreview,
  gridSize,
  panelSize,
  onContextMenu,
}: {
  control: Control;
  parentControl: Control;
  editable: boolean;
  layoutPreview?: boolean;
  gridSize: number;
  panelSize: { width: number; height: number };
  onContextMenu: (event: React.MouseEvent<HTMLElement>, controlId: string) => void;
}) {
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const draggingControlId = useAppStore((state) => state.draggingControlId);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const selected = editable && selectedControlId === control.id;

  const handleCommit = useCallback(
    (x: number, y: number) => {
      const tabsControlId = useAppStore.getState().dragHoverTabsId;
      if (
        tabsControlId &&
        tabsControlId !== parentControl.id &&
        assignControlToHoveredTab(control.id, tabsControlId)
      ) {
        setTabDropHover(null);
        return;
      }

      setTabDropHover(null);
      updateControlLayout(control.id, { x, y });
    },
    [control.id, parentControl.id, updateControlLayout],
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

  const isDragging = draggingControlId === control.id;

  return (
    <Box
      data-control-frame={control.id}
      onContextMenu={(event) => onContextMenu(event, control.id)}
      sx={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: dragging || selected ? 2 : 1,
        opacity: dragging ? 0.92 : isDragging ? 0.35 : 1,
        pointerEvents: dragging ? "none" : "auto",
      }}
    >
      <ResizableControlFrame
        control={control}
        editable={editable}
        layoutPreview={layoutPreview}
        gridSize={gridSize}
        canvasSize={panelSize}
        subtractPosition
        showDragHandle={editable}
        onDragStart={startDrag}
        showCanvasDragHandle={editable}
      />
    </Box>
  );
}

export function TabPanelContent({
  parentControl,
  tab,
  active,
  editable,
  layoutPreview = false,
  gridSize = LAYOUT_GRID_SIZE,
}: TabPanelContentProps) {
  const { t } = useTranslation();
  const assignControlToTab = useAppStore((state) => state.assignControlToTab);
  const selectControl = useAppStore((state) => state.selectControl);
  const tabDropPreview = useAppStore((state) => state.tabDropPreview);
  const draggingControlId = useAppStore((state) => state.draggingControlId);
  const controls = useAppStore((state) => state.controls);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const [panelSize, setPanelSize] = useState({ width: 320, height: 200 });
  const [dragOverPanel, setDragOverPanel] = useState(false);
  const children = tabChildControls(controls, parentControl.id, tab.id);
  const contentSize = tabPanelContentSize(children, panelSize);
  const { menu: widgetMenu, handleWidgetContextMenu, closeMenu: closeWidgetMenu } =
    useWidgetContextMenu(editable);
  const previewForPanel =
    tabDropPreview?.tabsControlId === parentControl.id &&
    tabDropPreview.tabId === tab.id
      ? tabDropPreview
      : null;
  const showDropHighlight = editable && (dragOverPanel || previewForPanel !== null);
  const previewSourceId = previewForPanel?.sourceControlId ?? draggingControlId;
  const previewSourceControl = previewSourceId
    ? controls.find((control) => control.id === previewSourceId) ?? null
    : null;
  const previewWidth = previewSourceControl?.layout.width ?? 160;
  const previewHeight = previewSourceControl
    ? controlLayoutHeight(previewSourceControl)
    : 120;

  useLayoutEffect(() => {
    if (!active || !panelRef.current) {
      return;
    }

    const element = panelRef.current;
    const updateSize = () => {
      setPanelSize({
        width: Math.max(160, element.clientWidth),
        height: Math.max(120, element.clientHeight),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, children.length]);

  const clearPanelDragState = () => {
    dragDepthRef.current = 0;
    setDragOverPanel(false);
    setTabDropHover(null);
  };

  const updateDropPreview = (event: React.DragEvent<HTMLElement>) => {
    const content = contentRef.current;
    if (!content) {
      setTabDropHover(null);
      return;
    }

    const position = dropPositionInElement(
      event.clientX,
      event.clientY,
      content,
      gridSize,
    );
    setTabDropHover({
      tabsControlId: parentControl.id,
      tabId: tab.id,
      x: position.x,
      y: position.y,
      sourceControlId: draggingControlId ?? undefined,
    });
  };

  const assignDroppedControl = (
    sourceId: string,
    event: React.DragEvent<HTMLElement>,
  ) => {
    if (sourceId === parentControl.id) {
      return;
    }

    const content = contentRef.current;
    const position = content
      ? dropPositionInElement(event.clientX, event.clientY, content, gridSize)
      : undefined;
    assignControlToTab(sourceId, parentControl.id, tab.id, position);
  };

  const handlePanelDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }

    allowDrop(event);
    dragDepthRef.current += 1;
    setDragOverPanel(true);
    updateDropPreview(event);
  };

  const handlePanelDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }

    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && panelRef.current?.contains(nextTarget)) {
      return;
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragOverPanel(false);
      setTabDropHover(null);
    }
  };

  const handlePanelDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }

    allowDrop(event);
    setDragOverPanel(true);
    updateDropPreview(event);
  };

  const handlePanelDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearPanelDragState();

    const sourceId = resolveDroppedControlId(event.dataTransfer);
    if (sourceId) {
      assignDroppedControl(sourceId, event);
    }

    endControlDrag();
  };

  if (!active) {
    return null;
  }

  const dragHandlers = editable
    ? {
        onDragEnter: handlePanelDragEnter,
        onDragOver: handlePanelDragOver,
        onDragLeave: handlePanelDragLeave,
        onDrop: handlePanelDrop,
      }
    : {};

  return (
    <Box
      ref={panelRef}
      role="tabpanel"
      aria-labelledby={tab.id}
      sx={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: editable ? "auto" : "hidden",
      }}
    >
      <Box
        ref={contentRef}
        data-tab-drop-target={parentControl.id}
        data-tab-id={tab.id}
        onPointerDown={(event) => {
          if (!editable || event.button !== 0) {
            return;
          }

          if (event.target === event.currentTarget) {
            selectControl(null);
          }
        }}
        {...(draggingControlId ? {} : dragHandlers)}
        sx={{
          position: "relative",
          width: contentSize.width,
          height: contentSize.height,
          minWidth: "100%",
          minHeight: "100%",
          flexShrink: 0,
          boxSizing: "border-box",
          borderRadius: 1,
          border: 1,
          borderStyle: showDropHighlight ? "dashed" : "solid",
          borderColor: showDropHighlight ? "primary.main" : "divider",
          bgcolor: showDropHighlight
            ? (theme) => alpha(theme.palette.primary.main, 0.06)
            : "transparent",
          backgroundImage: editable
            ? `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`
            : "none",
          backgroundSize: editable ? `${gridSize}px ${gridSize}px` : "auto",
          transition: "background-color 0.15s ease, border-color 0.15s ease",
        }}
      >
        {previewForPanel && (
          <DropPlacementPreview
            x={previewForPanel.x}
            y={previewForPanel.y}
            width={previewWidth}
            height={previewHeight}
          />
        )}

        {children.length === 0 && editable && !showDropHighlight && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 2,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {t("control.dragOntoGrid")}
          </Typography>
        )}

        {children.map((child) => (
          <TabChildItem
            key={child.id}
            control={child}
            parentControl={parentControl}
            editable={editable}
            layoutPreview={layoutPreview}
            gridSize={gridSize}
            panelSize={contentSize}
            onContextMenu={handleWidgetContextMenu}
          />
        ))}

        {editable && draggingControlId && (
          <Box
            {...dragHandlers}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 6,
            }}
          />
        )}
      </Box>
      <ControlWidgetMenu
        open={widgetMenu !== null}
        onClose={closeWidgetMenu}
        controlId={widgetMenu?.controlId ?? null}
        anchorPosition={widgetMenu ?? undefined}
      />
    </Box>
  );
}
