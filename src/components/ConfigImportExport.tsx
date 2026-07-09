import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState, type ChangeEvent } from "react";
import { exportConfigToFile, parseConfigImport } from "../lib/config";
import { useAppStore } from "../store/useAppStore";
import { AppDialogTitle } from "./AppDialogHeader";

export function ConfigImportExport({ compact = false }: { compact?: boolean }) {
  const controls = useAppStore((state) => state.controls);
  const output = useAppStore((state) => state.output);
  const performerIo = useAppStore((state) => state.performerIo);
  const layoutSettings = useAppStore((state) => state.layoutSettings);
  const importConfig = useAppStore((state) => state.importConfig);
  const setLastError = useAppStore((state) => state.setLastError);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = () => {
    exportConfigToFile({ controls, output, performerIo, layoutSettings });
    setSuccessMessage("Config exported.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      parseConfigImport(raw);
      setPendingImport(raw);
      setConfirmOpen(true);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) {
      return;
    }

    try {
      const config = parseConfigImport(pendingImport);
      importConfig(config);
      setSuccessMessage(`Imported ${config.controls.length} control(s).`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingImport(null);
      setConfirmOpen(false);
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setConfirmOpen(false);
  };

  return (
    <>
      <Stack spacing={compact ? 1 : 2}>
        {!compact && (
          <>
            <Typography variant="h6">Config</Typography>
            <Typography variant="body2" color="text.secondary">
              Back up or restore your layout, controls, and connection settings.
            </Typography>
          </>
        )}

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size={compact ? "small" : "medium"}
            fullWidth={!compact}
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            size={compact ? "small" : "medium"}
            fullWidth={!compact}
            startIcon={<FileUploadIcon />}
            onClick={handleImportClick}
          >
            Import
          </Button>
        </Stack>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFileChange}
        />
      </Stack>

      <Dialog open={confirmOpen} onClose={handleCancelImport}>
        <AppDialogTitle onClose={handleCancelImport}>Import config?</AppDialogTitle>
        <DialogContent>
          <DialogContentText>
            This replaces your current layout, controls, and connection settings. Export first
            if you want to keep a backup.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelImport}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmImport}>
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
