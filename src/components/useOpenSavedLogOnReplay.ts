import { useEffect } from "react";
import type { MonitorLogProtocol } from "../lib/monitorLog";
import { useMonitorLogStore } from "../store/useMonitorLogStore";

export function useOpenSavedLogOnReplay(protocol: MonitorLogProtocol, setTab: (tab: "saved") => void) {
  const pendingSelection = useMonitorLogStore((state) => state.pendingSelection);

  useEffect(() => {
    if (pendingSelection?.protocol === protocol) {
      setTab("saved");
    }
  }, [pendingSelection, protocol, setTab]);
}
