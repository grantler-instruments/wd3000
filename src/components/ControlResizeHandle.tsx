import { Box } from "@mui/material";

interface ControlResizeHandleProps {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
}

export function ControlResizeHandle({ onPointerDown }: ControlResizeHandleProps) {
  return (
    <Box
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      sx={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 18,
        height: 18,
        zIndex: 4,
        cursor: "nwse-resize",
        touchAction: "none",
        userSelect: "none",
        "&::before": {
          content: '""',
          position: "absolute",
          right: 4,
          bottom: 4,
          width: 10,
          height: 10,
          borderRight: 2,
          borderBottom: 2,
          borderColor: "text.secondary",
        },
      }}
    />
  );
}
