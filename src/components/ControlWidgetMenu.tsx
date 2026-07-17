import { Divider, Menu, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        {t("control.editWidgetEllipsis")}
      </MenuItem>
      <Divider />
      <ShortcutMenuItem
        label={t("common.copy")}
        shortcut={formatShortcutKey("c")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => copyControl(controlId))}
      />
      <ShortcutMenuItem
        label={t("common.cut")}
        shortcut={formatShortcutKey("x")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => cutControl(controlId))}
      />
      <ShortcutMenuItem
        label={t("common.duplicate")}
        shortcut={formatShortcutKey("d")}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => duplicateControl(controlId))}
      />
      <Divider />
      <ShortcutMenuItem
        label={t("common.delete")}
        shortcut={formatDeleteKey()}
        disabled={controlId === null}
        onClick={() => controlId && handleAction(() => removeControl(controlId))}
      />
    </Menu>
  );
}
