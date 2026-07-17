import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, ButtonProps } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ControlType } from "../types";
import { useAppStore } from "../store/useAppStore";
import { AddWidgetMenu } from "./AddWidgetMenu";

interface AddControlMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function AddControlMenu({
  size = "small",
  variant = "outlined",
}: AddControlMenuProps) {
  const { t } = useTranslation();
  const addControl = useAppStore((state) => state.addControl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = anchorEl !== null;

  const handleAdd = (type: ControlType) => {
    addControl(type);
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
        aria-controls={open ? "add-control-menu" : undefined}
      >
        {t("control.addWidget")}
      </Button>
      <AddWidgetMenu
        id="add-control-menu"
        open={open}
        onClose={() => setAnchorEl(null)}
        onAdd={handleAdd}
        anchorEl={anchorEl}
      />
    </>
  );
}
