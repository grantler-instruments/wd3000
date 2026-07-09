import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BugReportIcon from "@mui/icons-material/BugReport";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState, type MouseEvent, type ReactNode } from "react";
import { formatShortcutKey } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import type { DashboardView, DebuggerSubView, PerformerSubView } from "../types";
import { GrantlerLogo } from "./GrantlerLogo";
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

interface NavGroup<T extends string> {
  label: string;
  icon: ReactNode;
  view: DashboardView;
  items: { value: T; label: string }[];
}

const PERFORMER_NAV: NavGroup<PerformerSubView> = {
  label: "Performer",
  icon: <DashboardIcon fontSize="small" />,
  view: "performer",
  items: [
    { value: "ui", label: "UI" },
    { value: "sensors", label: "Sensors" },
    { value: "mediapipe", label: "MediaPipe" },
  ],
};

const DEBUGGER_NAV: NavGroup<DebuggerSubView> = {
  label: "Debugger",
  icon: <BugReportIcon fontSize="small" />,
  view: "debugger",
  items: [
    { value: "midi", label: "MIDI" },
    { value: "osc", label: "OSC" },
    { value: "tuio", label: "TUIO" },
    { value: "artnet", label: "Art-Net" },
  ],
};

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

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  activeView: DashboardView;
  performerSubView: PerformerSubView;
  debuggerSubView: DebuggerSubView;
  onSelectView: (view: DashboardView, subView: PerformerSubView | DebuggerSubView) => void;
  onRun: () => void;
  showRun: boolean;
  onOpenSettings: () => void;
}

function MobileNavDrawer({
  open,
  onClose,
  activeView,
  performerSubView,
  debuggerSubView,
  onSelectView,
  onRun,
  showRun,
  onOpenSettings,
}: MobileNavDrawerProps) {
  const groups = [PERFORMER_NAV, DEBUGGER_NAV];

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 260, pt: 1 }} role="presentation">
        {groups.map((group, groupIndex) => (
          <List
            key={group.view}
            dense
            subheader={
              <ListSubheader component="div" sx={{ lineHeight: 2.5 }}>
                {group.label}
              </ListSubheader>
            }
          >
            {group.items.map((item) => {
              const selected = activeView === group.view && (
                group.view === "performer"
                  ? performerSubView === item.value
                  : debuggerSubView === item.value
              );

              return (
                <ListItemButton
                  key={item.value}
                  selected={selected}
                  onClick={() => {
                    onSelectView(group.view, item.value);
                    onClose();
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{group.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
            {groupIndex < groups.length - 1 && <Divider sx={{ my: 0.5 }} />}
          </List>
        ))}

        <Divider />

        <List dense>
          {showRun && (
            <ListItemButton
              onClick={() => {
                onRun();
                onClose();
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={`Run ${formatShortcutKey("e")}`} />
            </ListItemButton>
          )}
          <ListItemButton
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="I/O settings" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}

export function AppHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const setMode = useAppStore((state) => state.setMode);
  const activeView = useAppStore((state) => state.activeView);
  const performerSubView = useAppStore((state) => state.performerSubView);
  const debuggerSubView = useAppStore((state) => state.debuggerSubView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const [ioSettingsOpen, setIoSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const showRun = activeView === "performer" && performerSubView === "ui";

  const handleSelectView = (
    view: DashboardView,
    subView: PerformerSubView | DebuggerSubView,
  ) => {
    if (view === "performer") {
      setActiveView("performer", subView as PerformerSubView);
      return;
    }

    setActiveView("debugger", subView as DebuggerSubView);
  };

  return (
    <>
      <AppBar position="static" elevation={0} color="default">
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          {isMobile ? (
            <IconButton
              edge="start"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
              sx={{ p: 0.5, mr: 0.5 }}
            >
              <GrantlerLogo height={30} />
            </IconButton>
          ) : (
            <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
              <NavSubmenu
                label={PERFORMER_NAV.label}
                icon={<DashboardIcon />}
                active={activeView === "performer"}
                currentSubView={performerSubView}
                items={PERFORMER_NAV.items}
                onSelectSubView={(subView) => setActiveView("performer", subView)}
              />
              <NavSubmenu
                label={DEBUGGER_NAV.label}
                icon={<BugReportIcon />}
                active={activeView === "debugger"}
                currentSubView={debuggerSubView}
                items={DEBUGGER_NAV.items}
                onSelectSubView={(subView) => setActiveView("debugger", subView)}
              />
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            {showRun && (
              isMobile ? (
                <IconButton
                  aria-label={`Run ${formatShortcutKey("e")}`}
                  color="primary"
                  onClick={() => setMode("play")}
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  <PlayArrowIcon />
                </IconButton>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setMode("play")}
                >
                  Run {formatShortcutKey("e")}
                </Button>
              )
            )}
            {!isMobile && (
              <IconButton
                aria-label="I/O settings"
                onClick={() => setIoSettingsOpen(true)}
                sx={{ color: "text.secondary" }}
              >
                <SettingsIcon />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        activeView={activeView}
        performerSubView={performerSubView}
        debuggerSubView={debuggerSubView}
        onSelectView={handleSelectView}
        onRun={() => setMode("play")}
        showRun={showRun}
        onOpenSettings={() => setIoSettingsOpen(true)}
      />

      <IoSettingsDialog open={ioSettingsOpen} onClose={() => setIoSettingsOpen(false)} />
    </>
  );
}
