import { Box, Button, Dialog, DialogActions, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { AppDialogHeader } from "./AppDialogHeader";
import { IoSettingsPanel } from "./IoSettingsPanel";
import { settingsTheme } from "../theme";

interface IoSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function IoSettingsDialog({ open, onClose }: IoSettingsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            height: { xs: "90vh", sm: 560 },
            maxHeight: "90vh",
          },
        },
      }}
    >
      <ThemeProvider theme={settingsTheme}>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <AppDialogHeader
            title="I/O settings"
            onClose={onClose}
            subtitle={
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                Shared across performers
              </Typography>
            }
          />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            <IoSettingsPanel />
          </Box>

          <DialogActions
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Button onClick={onClose} variant="contained" size="small">
              Done
            </Button>
          </DialogActions>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}
