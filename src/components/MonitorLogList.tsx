import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import type { DebugLogKind } from "../lib/debugLog";
import { isMidiDebugKind, midiKindLabel } from "../lib/midiTypes";
import {
  getReplayRowStatuses,
  type ReplayRowStatus,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";

export interface MonitorLogListItem {
  id: string;
  timestamp: number;
  direction: "in" | "out";
  kind: DebugLogKind;
  summary: string;
  portName?: string | null;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const base = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function kindLabel(kind: DebugLogKind) {
  if (kind === "osc") {
    return "OSC";
  }

  if (kind === "mqtt") {
    return "MQTT";
  }

  if (isMidiDebugKind(kind)) {
    return midiKindLabel(kind);
  }

  return kind;
}

function ReplayStatusIcon({ status }: { status?: ReplayRowStatus }) {
  if (status === "sent") {
    return (
      <CheckCircleOutlinedIcon
        aria-label="Sent"
        sx={{ width: 20, fontSize: 18, color: "success.main", flexShrink: 0 }}
      />
    );
  }

  if (status === "next") {
    return (
      <HourglassEmptyOutlinedIcon
        aria-label="Next to send"
        sx={{ width: 20, fontSize: 18, color: "warning.main", flexShrink: 0 }}
      />
    );
  }

  return <Box aria-hidden sx={{ width: 20, flexShrink: 0 }} />;
}

interface MonitorLogListProps {
  entries: MonitorLogListItem[];
  emptyMessage: string;
  logId?: string;
}

export function MonitorLogList({ entries, emptyMessage, logId }: MonitorLogListProps) {
  const replayProgress = useMonitorLogReplayProgress();
  const replayStatuses = useMemo(
    () => getReplayRowStatuses(entries, replayProgress, logId),
    [entries, logId, replayProgress],
  );
  const showReplayStatus =
    replayProgress.active &&
    Boolean(logId) &&
    replayProgress.logId === logId;

  if (entries.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ p: 2, textAlign: "center" }}
      >
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack divider={<Divider />}>
      {entries.map((entry) => (
        <Stack
          key={entry.id}
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            px: 2,
            py: 1,
            fontFamily: "monospace",
            fontSize: "0.8125rem",
          }}
        >
          {showReplayStatus && entry.direction === "in" ? (
            <ReplayStatusIcon status={replayStatuses.get(entry.id)} />
          ) : (
            <Box aria-hidden sx={{ width: 20, flexShrink: 0 }} />
          )}
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "inherit", minWidth: 108 }}
          >
            {formatTime(entry.timestamp)}
          </Typography>
          <Chip
            label={entry.direction === "in" ? "IN" : "OUT"}
            size="small"
            color={entry.direction === "in" ? "info" : "success"}
            sx={{ minWidth: 48 }}
          />
          <Chip label={kindLabel(entry.kind)} size="small" variant="outlined" />
          <Typography
            component="span"
            variant="body2"
            sx={{ fontFamily: "inherit", flex: 1 }}
          >
            {entry.summary}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function debugEntriesToListItems(
  entries: Array<{
    id: string;
    timestamp: number;
    direction: "in" | "out";
    kind: DebugLogKind;
    summary: string;
    portName?: string | null;
  }>,
): MonitorLogListItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    direction: entry.direction,
    kind: entry.kind,
    summary: entry.summary,
    portName: entry.portName,
  }));
}

export function monitorEventsToListItems(
  logId: string,
  events: Array<{
    timestamp: number;
    direction: "in" | "out";
    kind: DebugLogKind;
    summary: string;
    portName?: string | null;
  }>,
): MonitorLogListItem[] {
  return events.map((event, index) => ({
    id: `${logId}-${index}`,
    timestamp: event.timestamp,
    direction: event.direction,
    kind: event.kind,
    summary: event.summary,
    portName: event.portName,
  }));
}
