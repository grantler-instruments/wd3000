import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listMidiInputs } from "../../lib/input";
import { listMidiOutputs } from "../../lib/output";
import { useAppStore } from "../../store/useAppStore";
import { SettingsSectionNav } from "../SettingsSectionNav";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { MidiSettingsPanel } from "./MidiSettingsPanel";
import { MqttSettingsPanel } from "./MqttSettingsPanel";
import { OscSettingsPanel } from "./OscSettingsPanel";

export type IoSettingsSection = "general" | "osc" | "midi" | "mqtt";

function useIoSections() {
  const { t } = useTranslation();
  return [
    { id: "general" as const, label: t("control.general") },
    { id: "osc" as const, label: t("protocols.osc") },
    { id: "midi" as const, label: t("protocols.midi") },
    { id: "mqtt" as const, label: t("protocols.mqtt") },
  ];
}

export function IoSettingsPanel() {
  const sections = useIoSections();
  const [section, setSection] = useState<IoSettingsSection>("general");
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setMidiInputPorts = useAppStore((state) => state.setMidiInputPorts);
  const setLastError = useAppStore((state) => state.setLastError);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([listMidiOutputs(), listMidiInputs()])
      .then(([outputs, inputs]) => {
        if (cancelled) {
          return;
        }

        setMidiPorts(outputs);
        setMidiInputPorts(inputs);
      })
      .catch((error) => {
        if (!cancelled) {
          setLastError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setLastError, setMidiInputPorts, setMidiPorts]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}
    >
      <SettingsSectionNav sections={sections} section={section} onSelect={setSection} />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          px: { xs: 2, sm: 3 },
          py: 2.5,
        }}
      >
        {section === "general" && <GeneralSettingsPanel />}
        {section === "osc" && <OscSettingsPanel />}
        {section === "midi" && <MidiSettingsPanel />}
        {section === "mqtt" && <MqttSettingsPanel />}
      </Box>
    </Box>
  );
}
