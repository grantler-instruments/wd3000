import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Button, type ButtonProps, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { ControlType } from "../types";
import { AddWidgetMenu } from "./AddWidgetMenu";

interface AddControlMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function AddControlMenu({ size = "small", variant = "outlined" }: AddControlMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const addControl = useAppStore((state) => state.addControl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = anchorEl !== null;
  const label = t("control.addWidget");

  const handleAdd = (type: ControlType) => {
    addControl(type);
  };

  const menuProps = {
    "aria-haspopup": "menu" as const,
    "aria-expanded": open ? ("true" as const) : undefined,
    "aria-controls": open ? "add-control-menu" : undefined,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    },
  };

  return (
    <>
      {isMobile ? (
        <IconButton
          {...menuProps}
          aria-label={label}
          color="primary"
          size={size}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <AddIcon />
        </IconButton>
      ) : (
        <Button {...menuProps} variant={variant} size={size} endIcon={<ArrowDropDownIcon />}>
          {label}
        </Button>
      )}
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
