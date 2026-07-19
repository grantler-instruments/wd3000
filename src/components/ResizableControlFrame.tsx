import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box } from "@mui/material";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResizeControl } from "../hooks/useResizeControl";
import {
  peerRects,
  resizeLimitsAgainstPeers,
  resolveNonOverlappingSize,
} from "../lib/layoutCollision";
import { useAppStore } from "../store/useAppStore";
import {
  type Control,
  controlCanvasSizeLimits,
  controlLayoutHeight,
  LAYOUT_GRID_SIZE,
} from "../types";
import { ControlEditButton } from "./ControlEditButton";
import { ControlResizeHandle } from "./ControlResizeHandle";
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
}: ResizableControlFrameProps) {
  const { t } = useTranslation();
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const selectControl = useAppStore((state) => state.selectControl);
  const openControlInspector = useAppStore((state) => state.openControlInspector);
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const controls = useAppStore((state) => state.controls);
  const selected = editable && selectedControlId === control.id;
  const obstacles = peerRects(controls, control);
  const limits = resizeLimitsAgainstPeers(
    control,
    controlCanvasSizeLimits(control, canvasSize, subtractPosition),
    obstacles,
  );

  const handleCommit = useCallback(
    (width: number, height: number) => {
      updateControlLayout(control.id, { width, height });
    },
    [control.id, updateControlLayout],
  );

  const constrainSize = useCallback(
    (width: number, height: number) =>
      resolveNonOverlappingSize(
        {
          x: control.layout.x,
          y: control.layout.y,
          width,
          height,
        },
        peerRects(useAppStore.getState().controls, control),
        limits.minWidth,
        limits.minHeight,
        gridSize,
      ),
    [control, gridSize, limits.minHeight, limits.minWidth],
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
    constrainSize,
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
        boxShadow: selected ? (theme) => `0 0 0 2px ${theme.palette.primary.main}` : "none",
      }}
    >
      <ControlWidget
        control={control}
        editable={editable}
        layoutPreview={layoutPreview}
        hideLabel={showDragHandle}
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
          <ControlEditButton inline onClick={() => openControlInspector(control.id)} />
        </Box>
      )}
      {editable && !showDragHandle && (
        <ControlEditButton onClick={() => openControlInspector(control.id)} />
      )}
      {editable && <ControlResizeHandle onPointerDown={startResize} />}
    </Box>
  );
}
