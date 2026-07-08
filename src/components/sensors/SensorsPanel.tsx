import { useEffect } from "react";
import { listMidiOutputs } from "../../lib/output";
import { getAppPlatform } from "../../lib/platform";
import { useAppStore } from "../../store/useAppStore";
import { BrowserSensorsPanel } from "./BrowserSensorsPanel";
import { NativeSensorsPanel } from "./NativeSensorsPanel";

export function SensorsPanel() {
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const platform = getAppPlatform();

  useEffect(() => {
    void listMidiOutputs()
      .then((ports) => setMidiPorts(ports))
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  }, [setLastError, setMidiPorts]);

  if (platform === "browser") {
    return <BrowserSensorsPanel />;
  }

  return <NativeSensorsPanel />;
}
