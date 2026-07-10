import BugReportIcon from "@mui/icons-material/BugReport";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
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
  { value: "artnet", label: "Art-Net" },
  { value: "tuio", label: "TUIO" },
];

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
        <Stack spacing={5} sx={{ width: "100%", maxWidth: 560, alignItems: "center" }}>
          <GrantlerLogo height={56} />

          <Stack spacing={4} sx={{ width: "100%" }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                <DashboardIcon fontSize="small" color="action" />
                <Typography variant="overline" color="text.secondary">
                  Performer
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                {PERFORMER_ITEMS.map((item) => (
                  <Button
                    key={item.value}
                    variant="outlined"
                    onClick={() => setActiveView("performer", item.value)}
                    sx={{ minWidth: 120 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                <BugReportIcon fontSize="small" color="action" />
                <Typography variant="overline" color="text.secondary">
                  Debugger
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5 }}>
                {DEBUGGER_ITEMS.map((item) => (
                  <Button
                    key={item.value}
                    variant="outlined"
                    onClick={() => setActiveView("debugger", item.value)}
                    sx={{ minWidth: 120 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                <SettingsIcon fontSize="small" color="action" />
                <Typography variant="overline" color="text.secondary">
                  Settings
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setIoSettingsOpen(true)}
                sx={{ minWidth: 120 }}
              >
                I/O settings
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <IoSettingsDialog open={ioSettingsOpen} onClose={() => setIoSettingsOpen(false)} />
    </>
  );
}
