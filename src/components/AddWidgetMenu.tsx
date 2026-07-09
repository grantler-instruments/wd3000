import { Divider, Menu } from "@mui/material";
import { formatShortcutKey } from "../lib/platform";
import { CONTROL_WIDGET_TYPES, ControlType, controlTypeLabel } from "../types";
import { ShortcutMenuItem } from "./ShortcutMenuItem";

interface AddWidgetMenuProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  onAdd: (type: ControlType) => void;
  onPaste?: () => void;
  canPaste?: boolean;
  anchorEl?: HTMLElement | null;
  anchorPosition?: { top: number; left: number };
}

export function AddWidgetMenu({
  id = "add-widget-menu",
  open,
  onClose,
  onAdd,
  onPaste,
  canPaste = false,
  anchorEl = null,
  anchorPosition,
}: AddWidgetMenuProps) {
  const usePosition = anchorPosition !== undefined;

  return (
    <Menu
      id={id}
      anchorEl={usePosition ? undefined : anchorEl}
      anchorReference={usePosition ? "anchorPosition" : "anchorEl"}
      anchorPosition={usePosition ? anchorPosition : undefined}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      {canPaste && onPaste ? (
        <>
          <ShortcutMenuItem
            label="Paste"
            shortcut={formatShortcutKey("v")}
            onClick={() => {
              onPaste();
              onClose();
            }}
          />
          <Divider />
        </>
      ) : null}
      {CONTROL_WIDGET_TYPES.map((type) => (
        <ShortcutMenuItem
          key={type}
          label={controlTypeLabel(type)}
          onClick={() => {
            onAdd(type);
            onClose();
          }}
        />
      ))}
    </Menu>
  );
}
