import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  Button,
  ButtonProps,
  Menu,
  MenuItem,
} from "@mui/material";
import { useState } from "react";
import { CONTROL_WIDGET_TYPES, controlTypeLabel } from "../types";
import { useAppStore } from "../store/useAppStore";

interface AddControlMenuProps {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}

export function AddControlMenu({
  size = "small",
  variant = "outlined",
}: AddControlMenuProps) {
  const addControl = useAppStore((state) => state.addControl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = anchorEl !== null;

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdd = (type: (typeof CONTROL_WIDGET_TYPES)[number]) => {
    addControl(type);
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
        aria-controls={open ? "add-control-menu" : undefined}
      >
        Add widget
      </Button>
      <Menu
        id="add-control-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        {CONTROL_WIDGET_TYPES.map((type) => (
          <MenuItem key={type} onClick={() => handleAdd(type)}>
            {controlTypeLabel(type)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
