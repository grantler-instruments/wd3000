import {
  Box,
  Button,
  Dialog,
  DialogActions,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
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
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: { xs: 0.25, sm: 2 },
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" component="h2">
              I/O settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shared across performers
            </Typography>
          </Box>

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
