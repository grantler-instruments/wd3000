import { Divider, Menu, MenuItem } from "@mui/material";
import { formatDeleteKey, formatShortcutKey } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { ShortcutMenuItem } from "./ShortcutMenuItem";

interface ControlWidgetMenuProps {
  open: boolean;
  onClose: () => void;
  controlId: string | null;
  anchorPosition?: { top: number; left: number };
}

export function ControlWidgetMenu({
  open,
  onClose,
  controlId,
  anchorPosition,
}: ControlWidgetMenuProps) {
  const openControlInspector = useAppStore((state) => state.openControlInspector);
  const copyControl = useAppStore((state) => state.copyControl);
  const cutControl = useAppStore((state) => state.cutControl);
  const duplicateControl = useAppStore((state) => state.duplicateControl);
  const removeControl = useAppStore((state) => state.removeControl);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Menu
      id="control-widget-menu"
      open={open && controlId !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
    >
      <MenuItem
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => openControlInspector(controlId))}
      >
        Edit widget…
      </MenuItem>
      <Divider />
      <ShortcutMenuItem
        label="Copy"
        shortcut={formatShortcutKey("c")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => copyControl(controlId))}
      />
      <ShortcutMenuItem
        label="Cut"
        shortcut={formatShortcutKey("x")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => cutControl(controlId))}
      />
      <ShortcutMenuItem
        label="Duplicate"
        shortcut={formatShortcutKey("d")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => duplicateControl(controlId))}
      />
      <Divider />
      <ShortcutMenuItem
        label="Delete"
        shortcut={formatDeleteKey()}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => removeControl(controlId))}
      />
    </Menu>
  );
}
