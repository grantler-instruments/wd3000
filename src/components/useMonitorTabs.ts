import { useEffect, useState } from "react";
import type { MonitorLogProtocol } from "../lib/monitorLog";
import { useMonitorLogStore, useSavedMonitorLogs } from "../store/useMonitorLogStore";

export type MonitorTabValue = "live" | "replay" | (string & {});

export function useMonitorTabs(protocol: MonitorLogProtocol) {
  const logs = useSavedMonitorLogs(protocol);
  const pendingSelection = useMonitorLogStore((state) => state.pendingSelection);
  const clearPendingSelection = useMonitorLogStore((state) => state.clearPendingSelection);
  const [tab, setTab] = useState<MonitorTabValue>("live");

  useEffect(() => {
    if (pendingSelection?.protocol !== protocol) {
      return;
    }

    setTab(pendingSelection.id);
    clearPendingSelection();
  }, [clearPendingSelection, pendingSelection, protocol]);

  useEffect(() => {
    if (tab === "live" || tab === "replay") {
      return;
    }

    if (!logs.some((log) => log.id === tab)) {
      setTab("live");
    }
  }, [logs, tab]);

  return { tab, setTab, logs };
}
