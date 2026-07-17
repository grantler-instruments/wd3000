import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box } from "@mui/material";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResizeControl } from "../hooks/useResizeControl";
import {
  Control,
  LAYOUT_GRID_SIZE,
  controlCanvasSizeLimits,
  controlLayoutHeight,
} from "../types";
import { beginControlDrag } from "../lib/controlDrag";
import { useAppStore } from "../store/useAppStore";
import { ControlResizeHandle } from "./ControlResizeHandle";
import { ControlEditButton } from "./ControlEditButton";
import { ControlWidget } from "./ControlWidget";

interface ResizableControlFrameProps {
  control: Control;
  editable: boolean;
  layoutPreview?: boolean;
  gridSize?: number;
  canvasSize: { width: number; height: number };
  subtractPosition?: boolean;
  showDragHandle?: boolean;
  onDragStart?: (event: React.PointerEvent<HTMLElement>) => void;
  showCanvasDragHandle?: boolean;
  onCanvasDragStart?: (event: React.DragEvent<HTMLElement>) => void;
}

export function ResizableControlFrame({
  control,
  editable,
  layoutPreview = false,
  gridSize = LAYOUT_GRID_SIZE,
  canvasSize,
  subtractPosition = true,
  showDragHandle = false,
  onDragStart,
  showCanvasDragHandle = false,
  onCanvasDragStart,
}: ResizableControlFrameProps) {
  const { t } = useTranslation();
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const selectControl = useAppStore((state) => state.selectControl);
  const openControlInspector = useAppStore((state) => state.openControlInspector);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const selected = editable && selectedControlId === control.id;
  const limits = controlCanvasSizeLimits(control, canvasSize, subtractPosition);

  const handleCommit = useCallback(
    (width: number, height: number) => {
      updateControlLayout(control.id, { width, height });
    },
    [control.id, updateControlLayout],
  );

  const { size, resizing, startResize } = useResizeControl({
    enabled: editable,
    width: control.layout.width,
    height: controlLayoutHeight(control),
    minWidth: limits.minWidth,
    maxWidth: limits.maxWidth,
    minHeight: limits.minHeight,
    maxHeight: limits.maxHeight,
    gridSize,
    onCommit: handleCommit,
  });

  const width = editable ? size.width : control.layout.width;
  const height = editable ? size.height : controlLayoutHeight(control);

  return (
    <Box
      onPointerDown={(event) => {
        if (!editable || event.button !== 0) {
          return;
        }

        selectControl(control.id);
      }}
      sx={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
        overflow: "hidden",
        opacity: resizing ? 0.92 : 1,
        borderRadius: 1,
        boxSizing: "border-box",
        boxShadow: selected
          ? (theme) => `0 0 0 2px ${theme.palette.primary.main}`
          : "none",
      }}
    >
      <ControlWidget
        control={control}
        editable={editable}
        layoutPreview={layoutPreview}
        hideLabel={showDragHandle || (showCanvasDragHandle && !showDragHandle)}
      />
      {editable && showDragHandle && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            right: 4,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            onPointerDown={onDragStart}
            onClick={(event) => event.stopPropagation()}
            title={t("control.dragToReposition")}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.disabled",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
              borderRadius: 1,
              bgcolor: "action.hover",
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </Box>
          {showCanvasDragHandle && (
            <Box
              draggable
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => {
                beginControlDrag(event, control.id);
                onCanvasDragStart?.(event);
              }}
              onClick={(event) => event.stopPropagation()}
              title={t("control.dragIntoTabPanel")}
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.disabled",
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}
          <ControlEditButton
            inline
            onClick={() => openControlInspector(control.id)}
          />
        </Box>
      )}
      {editable && !showDragHandle && (
        <ControlEditButton onClick={() => openControlInspector(control.id)} />
      )}
      {editable && showCanvasDragHandle && !showDragHandle && (
        <Box
          draggable
          onPointerDown={(event) => event.stopPropagation()}
          onDragStart={(event) => {
            beginControlDrag(event, control.id);
            onCanvasDragStart?.(event);
          }}
          onClick={(event) => event.stopPropagation()}
          title={t("control.dragWidget")}
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            zIndex: 3,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.disabled",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            borderRadius: 1,
            bgcolor: "action.hover",
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      )}
      {editable && <ControlResizeHandle onPointerDown={startResize} />}
    </Box>
  );
}
