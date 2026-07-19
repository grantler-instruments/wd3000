import { alpha, Box, Typography } from "@mui/material";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDragPosition } from "../hooks/useDragPosition";
import { useLongPress } from "../hooks/useLongPress";
import { useWidgetContextMenu } from "../hooks/useWidgetContextMenu";
import {
  assignControlToHoveredTab,
  resolveCanvasDropAtPoint,
  resolveTabDropAtPoint,
  setTabDropHover,
} from "../lib/controlDrag";
import { useAppStore } from "../store/useAppStore";
import {
  type Control,
  type ControlTab,
  controlLayoutHeight,
  LAYOUT_GRID_SIZE,
  tabChildControls,
  tabPanelContentSize,
} from "../types";
import { ControlWidgetMenu } from "./ControlWidgetMenu";
import { ResizableControlFrame } from "./ResizableControlFrame";

interface TabPanelContentProps {
  parentControl: Control;
  tab: ControlTab;
  active: boolean;
  editable: boolean;
  layoutPreview?: boolean;
  gridSize?: number;
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
  onLongPressMenu,
}: {
  control: Control;
  parentControl: Control;
  editable: boolean;
  layoutPreview?: boolean;
  gridSize: number;
  panelSize: { width: number; height: number };
  onContextMenu: (event: React.MouseEvent<HTMLElement>, controlId: string) => void;
  onLongPressMenu: (controlId: string, clientX: number, clientY: number) => void;
}) {
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const assignControlToTab = useAppStore((state) => state.assignControlToTab);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const selected = editable && selectedControlId === control.id;
  const lastPointerRef = useRef({ clientX: 0, clientY: 0 });

  const handleCommit = useCallback(
    (x: number, y: number) => {
      const pointer = lastPointerRef.current;
      const preview = resolveTabDropAtPoint(pointer.clientX, pointer.clientY, gridSize, control.id);

      if (
        preview &&
        preview.tabsControlId !== parentControl.id &&
        assignControlToHoveredTab(control.id, preview.tabsControlId, {
          x: preview.x,
          y: preview.y,
        })
      ) {
        setTabDropHover(null);
        return;
      }

      if (!preview) {
        const canvasPosition = resolveCanvasDropAtPoint(pointer.clientX, pointer.clientY, gridSize);
        if (canvasPosition) {
          assignControlToTab(control.id, null, null, canvasPosition);
          setTabDropHover(null);
          return;
        }
      }

      setTabDropHover(null);
      updateControlLayout(control.id, { x, y });
    },
    [assignControlToTab, control.id, gridSize, parentControl.id, updateControlLayout],
  );

  const { position, dragging, startDrag } = useDragPosition({
    enabled: editable,
    x: control.layout.x,
    y: control.layout.y,
    gridSize,
    onCommit: handleCommit,
  });

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      startDrag(event);
    },
    [startDrag],
  );

  const longPressHandlers = useLongPress(
    editable ? (point) => onLongPressMenu(control.id, point.clientX, point.clientY) : null,
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      const preview = resolveTabDropAtPoint(event.clientX, event.clientY, gridSize, control.id);
      setTabDropHover(preview ? { ...preview, sourceControlId: control.id } : null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [dragging, gridSize, control.id]);

  return (
    <Box
      data-control-frame={control.id}
      onContextMenu={(event) => onContextMenu(event, control.id)}
      {...longPressHandlers}
      sx={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: dragging || selected ? 2 : 1,
        opacity: dragging ? 0.92 : 1,
        pointerEvents: dragging ? "none" : "auto",
        WebkitTouchCallout: "none",
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
        onDragStart={handleDragStart}
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
  const selectControl = useAppStore((state) => state.selectControl);
  const tabDropPreview = useAppStore((state) => state.tabDropPreview);
  const controls = useAppStore((state) => state.controls);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelSize, setPanelSize] = useState({ width: 320, height: 200 });
  const children = tabChildControls(controls, parentControl.id, tab.id);
  const contentSize = tabPanelContentSize(children, panelSize);
  const {
    menu: widgetMenu,
    openMenuAt,
    handleWidgetContextMenu,
    closeMenu: closeWidgetMenu,
  } = useWidgetContextMenu(editable);
  const previewForPanel =
    tabDropPreview?.tabsControlId === parentControl.id && tabDropPreview.tabId === tab.id
      ? tabDropPreview
      : null;
  const showDropHighlight = editable && previewForPanel !== null;
  const previewSourceId = previewForPanel?.sourceControlId;
  const previewSourceControl = previewSourceId
    ? (controls.find((control) => control.id === previewSourceId) ?? null)
    : null;
  const previewWidth = previewSourceControl?.layout.width ?? 160;
  const previewHeight = previewSourceControl ? controlLayoutHeight(previewSourceControl) : 120;

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
  }, [active]);

  if (!active) {
    return null;
  }

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
            onLongPressMenu={openMenuAt}
          />
        ))}
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
