import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, ButtonProps, Divider, Menu } from "@mui/material";
import { useState } from "react";
import { formatDeleteKey, formatShortcutKey } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { ShortcutMenuItem } from "./ShortcutMenuItem";

interface EditControlMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function EditControlMenu({
  size = "small",
  variant = "outlined",
}: EditControlMenuProps) {
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const controlClipboard = useAppStore((state) => state.controlClipboard);
  const copyControl = useAppStore((state) => state.copyControl);
  const cutControl = useAppStore((state) => state.cutControl);
  const pasteControl = useAppStore((state) => state.pasteControl);
  const duplicateControl = useAppStore((state) => state.duplicateControl);
  const removeControl = useAppStore((state) => state.removeControl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = anchorEl !== null;

  const canEditSelection = selectedControlId !== null;
  const canPaste = controlClipboard !== null;

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        aria-controls={open ? "edit-control-menu" : undefined}
      >
        Edit
      </Button>
      <Menu
        id="edit-control-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ShortcutMenuItem
          label="Copy"
          shortcut={formatShortcutKey("c")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => copyControl(selectedControlId))
          }
        />
        <ShortcutMenuItem
          label="Cut"
          shortcut={formatShortcutKey("x")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => cutControl(selectedControlId))
          }
        />
        <ShortcutMenuItem
          label="Paste"
          shortcut={formatShortcutKey("v")}
          disabled={!canPaste}
          onClick={() => handleAction(() => pasteControl())}
        />
        <ShortcutMenuItem
          label="Duplicate"
          shortcut={formatShortcutKey("d")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => duplicateControl(selectedControlId))
          }
        />
        <Divider />
        <ShortcutMenuItem
          label="Delete"
          shortcut={formatDeleteKey()}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => removeControl(selectedControlId))
          }
        />
      </Menu>
    </>
  );
}
