import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  exportMonitorLogToFile,
  formatMonitorLogDuration,
  type MonitorLogProtocol,
  parseMonitorLogImport,
} from "../lib/monitorLog";
import {
  defaultMonitorDirectionFilter,
  isMonitorFilterActive,
  matchesDirectionFilter,
} from "../lib/monitorLogFilter";
import {
  countIncomingMonitorEvents,
  countOutgoingMonitorEvents,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";
import { defaultMonitorMidiTypeFilter, matchesMidiTypeFilter } from "../lib/monitorMidiFilter";
import {
  collectMonitorMidiPorts,
  defaultMonitorMidiPortFilter,
  matchesMidiPortFilter,
} from "../lib/monitorMidiPortFilter";
import { useAppStore } from "../store/useAppStore";
import { useMonitorLogStore, useSavedMonitorLogs } from "../store/useMonitorLogStore";
import { MonitorFilterAccordion } from "./MonitorFilterAccordion";
import { MonitorLogList, monitorEventsToListItems } from "./MonitorLogList";
import { MonitorReplaySection } from "./MonitorReplaySection";

interface SavedMonitorLogTabProps {
  protocol: MonitorLogProtocol;
}

const PROTOCOL_KEYS: Record<MonitorLogProtocol, string> = {
  osc: "protocols.osc",
  midi: "protocols.midi",
  mqtt: "protocols.mqtt",
};

export function SavedMonitorLogTab({ protocol }: SavedMonitorLogTabProps) {
  const { t } = useTranslation();
  const logs = useSavedMonitorLogs(protocol);
  const saveLog = useMonitorLogStore((state) => state.saveLog);
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const pendingSelection = useMonitorLogStore((state) => state.pendingSelection);
  const clearPendingSelection = useMonitorLogStore((state) => state.clearPendingSelection);
  const setLastError = useAppStore((state) => state.setLastError);
  const replayProgress = useMonitorLogReplayProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState(defaultMonitorDirectionFilter);
  const [midiTypeFilter, setMidiTypeFilter] = useState(defaultMonitorMidiTypeFilter);
  const [midiPortFilter, setMidiPortFilter] = useState(defaultMonitorMidiPortFilter);
  const protocolLabel = t(PROTOCOL_KEYS[protocol]);

  useEffect(() => {
    if (pendingSelection?.protocol !== protocol) {
      return;
    }

    setSelectedId(pendingSelection.id);
    clearPendingSelection();
  }, [clearPendingSelection, pendingSelection, protocol]);

  const selectValue = logs.find((log) => log.id === selectedId)?.id ?? logs[0]?.id ?? "";
  const selectedLog = logs.find((log) => log.id === selectValue) ?? null;
  const incomingCount = selectedLog ? countIncomingMonitorEvents(selectedLog.events) : 0;
  const outgoingCount = selectedLog ? countOutgoingMonitorEvents(selectedLog.events) : 0;

  const allPreviewEntries = useMemo(
    () => monitorEventsToListItems(selectedLog?.id ?? "saved", selectedLog?.events ?? []),
    [selectedLog],
  );

  const availablePorts = useMemo(
    () => (protocol === "midi" ? collectMonitorMidiPorts(selectedLog?.events ?? [], [], []) : []),
    [protocol, selectedLog],
  );

  const isReplayingSelected =
    replayProgress.active && selectedLog !== null && replayProgress.logId === selectedLog.id;

  const previewEntries = useMemo(() => {
    if (isReplayingSelected) {
      return allPreviewEntries;
    }

    return allPreviewEntries.filter(
      (entry) =>
        matchesDirectionFilter(entry.direction, directionFilter) &&
        (protocol !== "midi" || matchesMidiTypeFilter(entry.kind, midiTypeFilter)) &&
        (protocol !== "midi" || matchesMidiPortFilter(entry.portName, midiPortFilter)),
    );
  }, [
    allPreviewEntries,
    directionFilter,
    isReplayingSelected,
    midiPortFilter,
    midiTypeFilter,
    protocol,
  ]);

  const handleDelete = () => {
    if (!selectedLog) {
      return;
    }

    removeLog(selectedLog.id);
  };

  const handleExport = () => {
    if (!selectedLog) {
      return;
    }

    exportMonitorLogToFile(selectedLog);
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
      const imported = parseMonitorLogImport(await file.text());
      if (imported.protocol !== protocol) {
        throw new Error(t("monitor.expectedProtocolLog", { protocol: protocolLabel }));
      }
      saveLog(imported);
      setSelectedId(imported.id);
      setSuccessMessage(t("monitor.importedLog", { name: imported.name }));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  if (logs.length === 0) {
    return (
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<FileUploadIcon />} onClick={handleImportClick}>
            {t("common.import")}
          </Button>
        </Stack>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          {t("monitor.noSavedLogs", { protocol: protocolLabel })}
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json,.wd3000.json"
          hidden
          onChange={handleFileChange}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 220, flex: 1, maxWidth: 360 }}>
          <InputLabel id={`saved-log-label-${protocol}`}>{t("monitor.savedLog")}</InputLabel>
          <Select
            labelId={`saved-log-label-${protocol}`}
            label={t("monitor.savedLog")}
            value={selectValue}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {logs.map((log) => (
              <MenuItem key={log.id} value={log.id}>
                {log.name} · {log.events.length} msgs · {formatMonitorLogDuration(log.events)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={!selectedLog}
          >
            {t("common.export")}
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            onClick={handleDelete}
            disabled={!selectedLog || isMonitorLogReplayActive()}
          >
            {t("common.delete")}
          </Button>
          <Button size="small" startIcon={<FileUploadIcon />} onClick={handleImportClick}>
            {t("common.import")}
          </Button>
        </Box>
      </Stack>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <MonitorReplaySection
        log={selectedLog}
        incomingCount={incomingCount}
        outgoingCount={outgoingCount}
      />

      <MonitorFilterAccordion
        protocol={protocol}
        directionFilter={directionFilter}
        onDirectionFilterChange={setDirectionFilter}
        midiTypeFilter={protocol === "midi" ? midiTypeFilter : undefined}
        onMidiTypeFilterChange={protocol === "midi" ? setMidiTypeFilter : undefined}
        midiPortFilter={protocol === "midi" ? midiPortFilter : undefined}
        onMidiPortFilterChange={protocol === "midi" ? setMidiPortFilter : undefined}
        midiPorts={availablePorts}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 200,
          overflow: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
        }}
      >
        <MonitorLogList
          logId={selectedLog?.id}
          entries={previewEntries}
          emptyMessage={
            !selectedLog
              ? t("monitor.selectSavedLog")
              : isReplayingSelected
                ? t("monitor.emptySavedLog")
                : isMonitorFilterActive(
                      directionFilter,
                      protocol === "midi" ? midiTypeFilter : undefined,
                      protocol === "midi" ? midiPortFilter : undefined,
                    )
                  ? t("monitor.noFilterMatch")
                  : t("monitor.emptySavedLog")
          }
        />
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.wd3000.json"
        hidden
        onChange={handleFileChange}
      />
    </Stack>
  );
}
