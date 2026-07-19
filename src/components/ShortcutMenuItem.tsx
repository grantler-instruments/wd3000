import { ListItemText, MenuItem } from "@mui/material";

interface ShortcutMenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function ShortcutMenuItem({ label, shortcut, disabled, onClick }: ShortcutMenuItemProps) {
  return (
    <MenuItem disabled={disabled} onClick={onClick}>
      <ListItemText primary={label} />
      {shortcut ? (
        <ListItemText
          primary={shortcut}
          sx={{ flex: "none", "& .MuiListItemText-primary": { color: "text.secondary" } }}
        />
      ) : null}
    </MenuItem>
  );
}
