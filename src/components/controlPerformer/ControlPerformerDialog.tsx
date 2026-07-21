import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { Box, Button, Dialog, DialogActions, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../../store/useAppStore";
import { settingsTheme } from "../../theme";
import { AppDialogHeader } from "../AppDialogHeader";
import { ControlInspector } from "./ControlInspector";

export function ControlPerformerDialog() {
  const { t } = useTranslation();
  const mode = useAppStore((state) => state.mode);
  const controls = useAppStore((state) => state.controls);
  const inspectorControlId = useAppStore((state) => state.inspectorControlId);
  const closeControlInspector = useAppStore((state) => state.closeControlInspector);
  const removeControl = useAppStore((state) => state.removeControl);
  const selectedControl = controls.find((control) => control.id === inspectorControlId) ?? null;
  const open = mode === "edit" && selectedControl !== null;

  const handleClose = () => {
    closeControlInspector();
  };

  const handleDelete = () => {
    if (!selectedControl) {
      return;
    }

    removeControl(selectedControl.id);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            height: { xs: "90vh", sm: 520 },
            maxHeight: "90vh",
          },
        },
      }}
    >
      <ThemeProvider theme={settingsTheme}>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <AppDialogHeader
            title={selectedControl?.label ?? t("control.widget")}
            onClose={handleClose}
            subtitle={
              selectedControl ? (
                <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
                  {t(`controlTypes.${selectedControl.type}`)}
                </Typography>
              ) : undefined
            }
          />

          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
            {selectedControl && (
              <ControlInspector control={selectedControl} key={selectedControl.id} />
            )}
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
            <Button
              color="error"
              size="small"
              startIcon={<DeleteOutlinedIcon />}
              onClick={handleDelete}
            >
              {t("common.delete")}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleClose} variant="contained" size="small">
              {t("common.done")}
            </Button>
          </DialogActions>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}
