import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BugReportIcon from "@mui/icons-material/BugReport";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
} from "@mui/material";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";
import { formatShortcutKey } from "../lib/platform";
import { IoSettingsDialog } from "./IoSettingsDialog";

function navButtonSx(active: boolean) {
  return {
    color: active ? "primary.main" : "text.secondary",
    bgcolor: active ? "action.selected" : "transparent",
    "&:hover": {
      bgcolor: active ? "action.selected" : "action.hover",
    },
  };
}

interface NavSubmenuProps<T extends string> {
  label: string;
  icon: ReactNode;
  active: boolean;
  currentSubView: T;
  items: { value: T; label: string }[];
  onSelectSubView: (value: T) => void;
}

function NavSubmenu<T extends string>({
  label,
  icon,
  active,
  currentSubView,
  items,
  onSelectSubView,
}: NavSubmenuProps<T>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (value: T) => {
    onSelectSubView(value);
    handleClose();
  };

  return (
    <>
      <Button
        startIcon={icon}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleOpen}
        sx={navButtonSx(active)}
      >
        {label}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {items.map((item) => (
          <MenuItem
            key={item.value}
            selected={active && currentSubView === item.value}
            onClick={() => handleSelect(item.value)}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function AppHeader() {
  const setMode = useAppStore((state) => state.setMode);
  const activeView = useAppStore((state) => state.activeView);
  const performerSubView = useAppStore((state) => state.performerSubView);
  const debuggerSubView = useAppStore((state) => state.debuggerSubView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const [ioSettingsOpen, setIoSettingsOpen] = useState(false);

  return (
    <>
      <AppBar position="static" elevation={0} color="default">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
            <NavSubmenu
              label="Performer"
              icon={<DashboardIcon />}
              active={activeView === "performer"}
              currentSubView={performerSubView}
              items={[
                { value: "ui", label: "UI" },
                { value: "sensors", label: "Sensors" },
                { value: "mediapipe", label: "MediaPipe" },
              ]}
              onSelectSubView={(subView) => setActiveView("performer", subView)}
            />
            <NavSubmenu
              label="Debugger"
              icon={<BugReportIcon />}
              active={activeView === "debugger"}
              currentSubView={debuggerSubView}
              items={[
                { value: "midi", label: "MIDI" },
                { value: "osc", label: "OSC" },
                { value: "tuio", label: "TUIO" },
                { value: "artnet", label: "Art-Net" },
              ]}
              onSelectSubView={(subView) => setActiveView("debugger", subView)}
            />
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            {activeView === "performer" && performerSubView === "ui" && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={() => setMode("play")}
              >
                Run {formatShortcutKey("e")}
              </Button>
            )}
            <IconButton
              aria-label="I/O settings"
              onClick={() => setIoSettingsOpen(true)}
              sx={{ color: "text.secondary" }}
            >
              <SettingsIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <IoSettingsDialog open={ioSettingsOpen} onClose={() => setIoSettingsOpen(false)} />
    </>
  );
}
