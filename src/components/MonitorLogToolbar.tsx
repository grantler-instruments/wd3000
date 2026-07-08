import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SaveIcon from "@mui/icons-material/Save";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";
import type { DebugLogEntry } from "../lib/debugLog";
import {
  createSavedMonitorLog,
  exportMonitorLogToFile,
  type MonitorLogProtocol,
} from "../lib/monitorLog";
import { useMonitorLogStore } from "../store/useMonitorLogStore";
import { useAppStore } from "../store/useAppStore";

interface MonitorLogToolbarProps {
  protocol: MonitorLogProtocol;
  entries: DebugLogEntry[];
}

export function MonitorLogToolbar({ protocol, entries }: MonitorLogToolbarProps) {
  const saveLog = useMonitorLogStore((state) => state.saveLog);
  const setLastError = useAppStore((state) => state.setLastError);
  const [saveOpen, setSaveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [name, setName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const disabled = entries.length === 0;
  const protocolLabel = protocol === "midi" ? "MIDI" : "OSC";

  const handleSave = () => {
    try {
      const log = createSavedMonitorLog(name, protocol, entries);
      saveLog(log);
      setSaveOpen(false);
      setSuccessMessage(`Saved "${log.name}" to library.`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleExport = () => {
    try {
      const log = createSavedMonitorLog(name, protocol, entries);
      exportMonitorLogToFile(log);
      setExportOpen(false);
      setSuccessMessage(`Exported ${log.name}.wd3000.json`);
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
            Save
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
            Export
          </Button>
        </Stack>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
      </Stack>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Save {protocolLabel} monitor log</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${protocolLabel} session`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Export {protocolLabel} monitor log</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="File name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`${protocolLabel.toLowerCase()}-session`}
            helperText="Exports as name.wd3000.json"
            sx={{ mt: 1 }}
            slotProps={{
              formHelperText: { sx: { mx: 0 } },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleExport} disabled={!name.trim()}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
