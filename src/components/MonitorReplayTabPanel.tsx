import StopIcon from "@mui/icons-material/Stop";
import { Box, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  removeReplaySessionEntry,
  stopMonitorLogReplay,
  useMonitorLogReplayProgress,
} from "../lib/monitorLogReplay";
import { debuggerLogSx } from "./debuggerLayoutSx";
import { MonitorLogList, type MonitorLogListItem } from "./MonitorLogList";

interface MonitorReplayTabPanelProps {
  entries: MonitorLogListItem[];
  emptyMessage: string;
}

/** Replay results tab: stop control stays visible while auto-switched here. */
export function MonitorReplayTabPanel({ entries, emptyMessage }: MonitorReplayTabPanelProps) {
  const { t } = useTranslation();
  const replayProgress = useMonitorLogReplayProgress();

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      {replayProgress.active && (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, justifyContent: "flex-end" }}>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<StopIcon />}
            onClick={() => stopMonitorLogReplay()}
          >
            {t("common.stop")}
          </Button>
        </Stack>
      )}
      <Box sx={debuggerLogSx}>
        <MonitorLogList
          entries={entries}
          emptyMessage={emptyMessage}
          onRemoveEntry={removeReplaySessionEntry}
        />
      </Box>
    </Stack>
  );
}
