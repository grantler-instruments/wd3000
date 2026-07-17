import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, ButtonProps, Divider, Menu } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePerformerHistoryAvailability } from "../hooks/usePerformerHistory";
import { redoPerformerEdit, undoPerformerEdit } from "../lib/performer-history";
import { formatDeleteKey, formatRedoKey, formatShortcutKey } from "../lib/platform";
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
  const { t } = useTranslation();
  const selectedControlId = useAppStore((state) => state.selectedControlId);
  const controlClipboard = useAppStore((state) => state.controlClipboard);
  const copyControl = useAppStore((state) => state.copyControl);
  const cutControl = useAppStore((state) => state.cutControl);
  const pasteControl = useAppStore((state) => state.pasteControl);
  const duplicateControl = useAppStore((state) => state.duplicateControl);
  const removeControl = useAppStore((state) => state.removeControl);
  const { canUndo, canRedo } = usePerformerHistoryAvailability();
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
        {t("common.edit")}
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
          label={t("common.undo")}
          shortcut={formatShortcutKey("z")}
          disabled={!canUndo}
          onClick={() => handleAction(() => undoPerformerEdit())}
        />
        <ShortcutMenuItem
          label={t("common.redo")}
          shortcut={formatRedoKey()}
          disabled={!canRedo}
          onClick={() => handleAction(() => redoPerformerEdit())}
        />
        <Divider />
        <ShortcutMenuItem
          label={t("common.copy")}
          shortcut={formatShortcutKey("c")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => copyControl(selectedControlId))
          }
        />
        <ShortcutMenuItem
          label={t("common.cut")}
          shortcut={formatShortcutKey("x")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => cutControl(selectedControlId))
          }
        />
        <ShortcutMenuItem
          label={t("common.paste")}
          shortcut={formatShortcutKey("v")}
          disabled={!canPaste}
          onClick={() => handleAction(() => pasteControl())}
        />
        <ShortcutMenuItem
          label={t("common.duplicate")}
          shortcut={formatShortcutKey("d")}
          disabled={!canEditSelection}
          onClick={() =>
            selectedControlId && handleAction(() => duplicateControl(selectedControlId))
          }
        />
        <Divider />
        <ShortcutMenuItem
          label={t("common.delete")}
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
