import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Alert, Box, Button, Stack } from "@mui/material";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  exportMonitorLogToFile,
  type MonitorLogProtocol,
  parseMonitorLogImport,
} from "../lib/monitorLog";
import { isMonitorFilterActive, matchesDirectionFilter } from "../lib/monitorLogFilter";
import {
  countIncomingMonitorEvents,
  countOutgoingMonitorEvents,
  isMonitorLogReplayActive,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";
import { matchesMidiTypeFilter } from "../lib/monitorMidiFilter";
import { collectMonitorMidiPorts, matchesMidiPortFilter } from "../lib/monitorMidiPortFilter";
import { useAppStore } from "../store/useAppStore";
import { useMonitorFilters } from "../store/useMonitorFilterStore";
import { useMonitorLogStore, useSavedMonitorLogs } from "../store/useMonitorLogStore";
import { MonitorFilterAccordion } from "./MonitorFilterAccordion";
import { MonitorLogList, monitorEventsToListItems } from "./MonitorLogList";
import { MonitorReplaySection } from "./MonitorReplaySection";

interface SavedMonitorLogTabProps {
  protocol: MonitorLogProtocol;
  logId: string;
  onDeleted?: () => void;
  onImported?: (logId: string) => void;
}

const PROTOCOL_KEYS: Record<MonitorLogProtocol, string> = {
  osc: "protocols.osc",
  midi: "protocols.midi",
  mqtt: "protocols.mqtt",
  artnet: "protocols.artnet",
};

export function SavedMonitorLogTab({
  protocol,
  logId,
  onDeleted,
  onImported,
}: SavedMonitorLogTabProps) {
  const { t } = useTranslation();
  const logs = useSavedMonitorLogs(protocol);
  const saveLog = useMonitorLogStore((state) => state.saveLog);
  const removeLog = useMonitorLogStore((state) => state.removeLog);
  const removeLogEvent = useMonitorLogStore((state) => state.removeLogEvent);
  const setLastError = useAppStore((state) => state.setLastError);
  const replayProgress = useMonitorLogReplayProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    directionFilter,
    setDirectionFilter,
    midiTypeFilter,
    setMidiTypeFilter,
    midiPortFilter,
    setMidiPortFilter,
  } = useMonitorFilters(protocol);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const protocolLabel = t(PROTOCOL_KEYS[protocol]);

  const selectedLog = logs.find((log) => log.id === logId) ?? null;
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
    onDeleted?.();
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
      setSuccessMessage(t("monitor.importedLog", { name: imported.name }));
      onImported?.(imported.id);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          flexShrink: 0,
          alignItems: "flex-start",
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
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
          onRemoveEntry={
            selectedLog
              ? (entryId) => {
                  const prefix = `${selectedLog.id}-`;
                  if (!entryId.startsWith(prefix)) {
                    return;
                  }

                  const eventIndex = Number(entryId.slice(prefix.length));
                  if (!Number.isInteger(eventIndex)) {
                    return;
                  }

                  removeLogEvent(selectedLog.id, eventIndex);
                }
              : undefined
          }
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
