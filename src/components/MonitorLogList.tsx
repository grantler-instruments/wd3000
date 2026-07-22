import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import { Box, Chip, Divider, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLongPress } from "../hooks/useLongPress";
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

interface MonitorLogListRowProps {
  entry: MonitorLogListItem;
  kindLabel: string;
  replayStatus?: ReplayRowStatus;
  showReplayStatus: boolean;
  onRemove?: (id: string) => void;
  onOpenMenu: (entryId: string, clientX: number, clientY: number) => void;
}

function MonitorLogListRow({
  entry,
  kindLabel,
  replayStatus,
  showReplayStatus,
  onRemove,
  onOpenMenu,
}: MonitorLogListRowProps) {
  const { t } = useTranslation();
  const longPressHandlers = useLongPress(
    onRemove ? (point) => onOpenMenu(entry.id, point.clientX, point.clientY) : null,
  );

  return (
    <Stack
      direction="row"
      spacing={1.5}
      onContextMenu={
        onRemove
          ? (event) => {
              event.preventDefault();
              onOpenMenu(entry.id, event.clientX, event.clientY);
            }
          : undefined
      }
      {...longPressHandlers}
      sx={{
        alignItems: "center",
        flexWrap: "nowrap",
        px: { xs: 1.5, sm: 2 },
        py: 1,
        fontFamily: "monospace",
        fontSize: "0.8125rem",
        minWidth: 0,
        touchAction: onRemove ? "manipulation" : undefined,
        WebkitTouchCallout: onRemove ? "none" : undefined,
        userSelect: onRemove ? "none" : undefined,
        "&:hover .monitor-log-remove": {
          opacity: 1,
        },
      }}
    >
      {showReplayStatus ? (
        <ReplayStatusIcon status={replayStatus} />
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
      <Chip label={kindLabel} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
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
      {onRemove && (
        <IconButton
          className="monitor-log-remove"
          size="small"
          aria-label={t("common.remove")}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(entry.id);
          }}
          sx={{
            flexShrink: 0,
            display: { xs: "none", sm: "inline-flex" },
            opacity: 0,
            transition: "opacity 0.15s ease",
            p: 0.25,
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Stack>
  );
}

interface MonitorLogListProps {
  entries: MonitorLogListItem[];
  emptyMessage: string;
  logId?: string;
  onRemoveEntry?: (id: string) => void;
}

export function MonitorLogList({
  entries,
  emptyMessage,
  logId,
  onRemoveEntry,
}: MonitorLogListProps) {
  const { t } = useTranslation();
  const replayProgress = useMonitorLogReplayProgress();
  const replayStatuses = useMemo(
    () => getReplayRowStatuses(entries, replayProgress, logId),
    [entries, logId, replayProgress],
  );
  const showReplayStatus =
    replayProgress.active && Boolean(logId) && replayProgress.logId === logId;

  const [menu, setMenu] = useState<{
    entryId: string;
    top: number;
    left: number;
  } | null>(null);

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
    <>
      <Stack divider={<Divider />}>
        {entries.map((entry) => (
          <MonitorLogListRow
            key={entry.id}
            entry={entry}
            kindLabel={kindLabel(entry.kind)}
            replayStatus={replayStatuses.get(entry.id)}
            showReplayStatus={showReplayStatus && entry.direction === replayProgress.direction}
            onRemove={onRemoveEntry}
            onOpenMenu={(entryId, clientX, clientY) =>
              setMenu({ entryId, top: clientY, left: clientX })
            }
          />
        ))}
      </Stack>

      <Menu
        open={menu !== null && Boolean(onRemoveEntry)}
        onClose={() => setMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.top, left: menu.left } : undefined}
      >
        <MenuItem
          onClick={() => {
            if (menu && onRemoveEntry) {
              onRemoveEntry(menu.entryId);
            }
            setMenu(null);
          }}
        >
          {t("common.remove")}
        </MenuItem>
      </Menu>
    </>
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
