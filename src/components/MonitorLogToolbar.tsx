import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DebugLogEntry } from "../lib/debugLog";
import {
  createSavedMonitorLog,
  exportMonitorLogToFile,
  type MonitorLogProtocol,
} from "../lib/monitorLog";
import { useMonitorLogStore } from "../store/useMonitorLogStore";
import { useAppStore } from "../store/useAppStore";
import { AppDialogTitle } from "./AppDialogHeader";

interface MonitorLogToolbarProps {
  protocol: MonitorLogProtocol;
  entries: DebugLogEntry[];
}

const PROTOCOL_KEYS: Record<MonitorLogProtocol, string> = {
  osc: "protocols.osc",
  midi: "protocols.midi",
  mqtt: "protocols.mqtt",
};

export function MonitorLogToolbar({ protocol, entries }: MonitorLogToolbarProps) {
  const { t } = useTranslation();
  const saveLog = useMonitorLogStore((state) => state.saveLog);
  const setLastError = useAppStore((state) => state.setLastError);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const disabled = entries.length === 0;
  const protocolLabel = t(PROTOCOL_KEYS[protocol]);

  const handleSave = () => {
    try {
      const log = createSavedMonitorLog(name, protocol, entries);
      saveLog(log);
      setSaveOpen(false);
      setSuccessMessage(t("monitor.savedToLibrary", { name: log.name }));
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
        </Stack>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
      </Stack>

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
