import BugReportIcon from "@mui/icons-material/BugReport";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAppStore } from "../store/useAppStore";
import type { DebuggerSubView, PerformerSubView } from "../types";
import { GrantlerLogo } from "./GrantlerLogo";
import { IoSettingsDialog } from "./IoSettingsDialog";

const PERFORMER_ITEMS: { value: PerformerSubView; label: string }[] = [
  { value: "ui", label: "UI" },
  { value: "sensors", label: "Sensors" },
  { value: "mediapipe", label: "MediaPipe" },
];

const DEBUGGER_ITEMS: { value: DebuggerSubView; label: string }[] = [
  { value: "midi", label: "MIDI" },
  { value: "osc", label: "OSC" },
  { value: "tuio", label: "TUIO" },
  { value: "artnet", label: "Art-Net" },
  { value: "mqtt", label: "MQTT" },
];

function HomeSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        {icon}
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

function HomeNavGrid({
  columns,
  children,
}: {
  columns: { xs?: number; sm?: number };
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? columns.sm ?? 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm ?? columns.xs ?? 1}, minmax(0, 1fr))`,
        },
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

function HomeNavButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      fullWidth
      sx={{
        minWidth: 0,
        px: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Button>
  );
}

export function HomePage() {
  const setActiveView = useAppStore((state) => state.setActiveView);
  const [ioSettingsOpen, setIoSettingsOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          overflow: "auto",
        }}
      >
        <Stack
          spacing={5}
          sx={{
            width: "100%",
            maxWidth: 720,
            alignItems: "center",
          }}
        >
          <GrantlerLogo height={56} />

          <Stack spacing={4} sx={{ width: "100%" }}>
            <HomeSection
              icon={<DashboardIcon fontSize="small" color="action" />}
              title="Performer"
            >
              <HomeNavGrid columns={{ xs: 1, sm: 3 }}>
                {PERFORMER_ITEMS.map((item) => (
                  <HomeNavButton
                    key={item.value}
                    label={item.label}
                    onClick={() => setActiveView("performer", item.value)}
                  />
                ))}
              </HomeNavGrid>
            </HomeSection>

            <HomeSection
              icon={<BugReportIcon fontSize="small" color="action" />}
              title="Debugger"
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${DEBUGGER_ITEMS.length}, minmax(0, 1fr))`,
                  gap: 1.5,
                  overflowX: "auto",
                  pb: 0.5,
                }}
              >
                {DEBUGGER_ITEMS.map((item) => (
                  <HomeNavButton
                    key={item.value}
                    label={item.label}
                    onClick={() => setActiveView("debugger", item.value)}
                  />
                ))}
              </Box>
            </HomeSection>

            <HomeSection
              icon={<SettingsIcon fontSize="small" color="action" />}
              title="Settings"
            >
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setIoSettingsOpen(true)}
                sx={{ minWidth: 160 }}
              >
                I/O settings
              </Button>
            </HomeSection>
          </Stack>
        </Stack>
      </Box>

      <IoSettingsDialog open={ioSettingsOpen} onClose={() => setIoSettingsOpen(false)} />
    </>
  );
}
