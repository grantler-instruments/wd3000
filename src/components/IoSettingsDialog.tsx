import { Box, Button, Dialog, DialogActions } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { settingsTheme } from "../theme";
import { AppDialogHeader } from "./AppDialogHeader";
import { IoSettingsPanel } from "./ioSettings";

interface IoSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function IoSettingsDialog({ open, onClose }: IoSettingsDialogProps) {
  const { t } = useTranslation();

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
          <AppDialogHeader title={t("home.settings")} onClose={onClose} />

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
              {t("common.done")}
            </Button>
          </DialogActions>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}
