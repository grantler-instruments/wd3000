import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { formatShortcutKey } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { AddControlMenu } from "./AddControlMenu";
import { EditControlMenu } from "./EditControlMenu";
import { ProjectMenu } from "./ProjectMenu";
import { GrantlerLogo } from "./GrantlerLogo";

export function PageHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const setMode = useAppStore((state) => state.setMode);
  const activeView = useAppStore((state) => state.activeView);
  const performerSubView = useAppStore((state) => state.performerSubView);
  const setActiveView = useAppStore((state) => state.setActiveView);

  const showUiEditor = activeView === "performer" && performerSubView === "ui";
  const showRunButton =
    activeView === "performer" &&
    (performerSubView === "ui" || performerSubView === "mediapipe");

  return (
    <AppBar position="static" elevation={0} color="default">
        <Toolbar variant="dense" sx={{ gap: 1, flexWrap: "wrap" }}>
          <IconButton
            edge="start"
            aria-label="Back to home"
            onClick={() => setActiveView("home")}
            sx={{ p: 0.5, mr: 0.5 }}
          >
            <GrantlerLogo height={30} />
          </IconButton>

          {showUiEditor && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <ProjectMenu />
              <AddControlMenu />
              <EditControlMenu />
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            {showRunButton && (
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
          </Stack>
        </Toolbar>
    </AppBar>
  );
}
