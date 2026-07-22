import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
} from "@mui/material";
import { type ChangeEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DebugLogEntry } from "../lib/debugLog";
import {
  createSavedMonitorLog,
  exportMonitorLogToFile,
  type MonitorLogProtocol,
  parseMonitorLogImport,
} from "../lib/monitorLog";
import { useAppStore } from "../store/useAppStore";
import { useMonitorLogStore } from "../store/useMonitorLogStore";
import { AppDialogTitle } from "./AppDialogHeader";

interface MonitorLogToolbarProps {
  protocol: MonitorLogProtocol;
  entries: DebugLogEntry[];
  onSaved?: (logId: string) => void;
  onImported?: (logId: string) => void;
}

const PROTOCOL_KEYS: Record<MonitorLogProtocol, string> = {
  osc: "protocols.osc",
  midi: "protocols.midi",
  mqtt: "protocols.mqtt",
  artnet: "protocols.artnet",
};

export function MonitorLogToolbar({
  protocol,
  entries,
  onSaved,
  onImported,
}: MonitorLogToolbarProps) {
  const { t } = useTranslation();
  const saveLogAndSelect = useMonitorLogStore((state) => state.saveLogAndSelect);
  const setLastError = useAppStore((state) => state.setLastError);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const disabled = entries.length === 0;
  const protocolLabel = t(PROTOCOL_KEYS[protocol]);

  const handleSave = () => {
    try {
      const log = createSavedMonitorLog(name, protocol, entries);
      saveLogAndSelect(log);
      setSaveOpen(false);
      setSuccessMessage(t("monitor.savedToLibrary", { name: log.name }));
      onSaved?.(log.id);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleExport = () => {
    try {
      const log = createSavedMonitorLog(name, protocol, entries);
      exportMonitorLogToFile(log);
      setExportOpen(false);
      setSuccessMessage(t("monitor.exportedFile", { name: log.name }));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const imported = parseMonitorLogImport(await file.text());
      if (imported.protocol !== protocol) {
        throw new Error(t("monitor.expectedProtocolLog", { protocol: protocolLabel }));
      }
      saveLogAndSelect(imported);
      setSuccessMessage(t("monitor.importedLog", { name: imported.name }));
      onImported?.(imported.id);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button
            size="small"
            startIcon={<SaveIcon />}
            onClick={() => {
              setName("");
              setSaveOpen(true);
            }}
            disabled={disabled}
          >
            {t("common.save")}
          </Button>
          <Button
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={() => {
              setName("");
              setExportOpen(true);
            }}
            disabled={disabled}
          >
            {t("common.export")}
          </Button>
          <Button
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("common.import")}
          </Button>
        </Stack>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
      </Stack>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.wd3000.json"
        hidden
        onChange={handleFileChange}
      />

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="xs">
        <AppDialogTitle onClose={() => setSaveOpen(false)}>
          {t("monitor.saveLogTitle", { protocol: protocolLabel })}
        </AppDialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("common.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("monitor.sessionPlaceholder", { protocol: protocolLabel })}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="xs">
        <AppDialogTitle onClose={() => setExportOpen(false)}>
          {t("monitor.exportLogTitle", { protocol: protocolLabel })}
        </AppDialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("common.fileName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("monitor.sessionPlaceholder", { protocol: protocolLabel })}
            helperText={t("monitor.exportsAs")}
            sx={{ mt: 1 }}
            slotProps={{
              formHelperText: { sx: { mx: 0 } },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleExport} disabled={!name.trim()}>
            {t("common.export")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
