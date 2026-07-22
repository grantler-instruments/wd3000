import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DebugLogKind } from "../lib/debugLog";
import { isMidiDebugKind, type MidiDebugKind } from "../lib/midiTypes";
import {
  getReplayRowStatuses,
  type ReplayRowStatus,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";

const MIDI_KIND_KEYS: Record<MidiDebugKind, string> = {
  "midi-note": "midiKinds.note",
  "midi-cc": "midiKinds.cc",
  "midi-pc": "midiKinds.pc",
  "midi-pitch-bend": "midiKinds.pitch",
  "midi-pressure": "midiKinds.pressure",
  "midi-poly-pressure": "midiKinds.polyAt",
  "midi-mtc": "midiKinds.mtc",
  "midi-song-position": "midiKinds.songPos",
  "midi-song-select": "midiKinds.songSel",
  "midi-tune-request": "midiKinds.tune",
  "midi-sysex": "midiKinds.sysex",
  "midi-sysex-end": "midiKinds.eox",
  "midi-timing-clock": "midiKinds.clock",
  "midi-start": "midiKinds.start",
  "midi-continue": "midiKinds.continue",
  "midi-stop": "midiKinds.stop",
  "midi-active-sensing": "midiKinds.sense",
  "midi-system-reset": "midiKinds.reset",
  "midi-raw": "midiKinds.raw",
};

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

function ReplayStatusIcon({ status }: { status?: ReplayRowStatus }) {
  const { t } = useTranslation();

  if (status === "sent") {
    return (
      <CheckCircleOutlinedIcon
        aria-label={t("monitor.sent")}
        sx={{ width: 20, fontSize: 18, color: "success.main", flexShrink: 0 }}
      />
    );
  }

  if (status === "next") {
    return (
      <HourglassEmptyOutlinedIcon
        aria-label={t("monitor.nextToSend")}
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
  const { t } = useTranslation();
  const replayProgress = useMonitorLogReplayProgress();
  const replayStatuses = useMemo(
    () => getReplayRowStatuses(entries, replayProgress, logId),
    [entries, logId, replayProgress],
  );
  const showReplayStatus =
    replayProgress.active && Boolean(logId) && replayProgress.logId === logId;

  const kindLabel = (kind: DebugLogKind) => {
    if (kind === "osc") {
      return t("protocols.osc");
    }

    if (kind === "mqtt") {
      return t("protocols.mqtt");
    }

    if (kind === "artnet") {
      return t("protocols.artnet");
    }

    if (isMidiDebugKind(kind)) {
      return t(MIDI_KIND_KEYS[kind]);
    }

    return kind;
  };

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
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
            flexWrap: "wrap",
            rowGap: 0.5,
            px: { xs: 1.5, sm: 2 },
            py: 1,
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            minWidth: 0,
          }}
        >
          {showReplayStatus && entry.direction === replayProgress.direction ? (
            <ReplayStatusIcon status={replayStatuses.get(entry.id)} />
          ) : (
            <Box aria-hidden sx={{ width: 20, flexShrink: 0 }} />
          )}
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{ fontFamily: "inherit", minWidth: { xs: 72, sm: 108 }, flexShrink: 0 }}
          >
            {formatTime(entry.timestamp)}
          </Typography>
          <Chip
            label={entry.direction === "in" ? "IN" : "OUT"}
            size="small"
            color={entry.direction === "in" ? "info" : "success"}
            sx={{ minWidth: 48, flexShrink: 0 }}
          />
          <Chip
            label={kindLabel(entry.kind)}
            size="small"
            variant="outlined"
            sx={{ flexShrink: 0 }}
          />
          <Typography
            component="span"
            variant="body2"
            sx={{
              fontFamily: "inherit",
              flex: "1 1 120px",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
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
