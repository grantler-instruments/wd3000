import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Control } from "../../types";
import { SettingsSectionNav } from "../SettingsSectionNav";
import { stackedAccordionSx } from "../stackedAccordionSx";
import { GeneralSection } from "./sections/GeneralSection";
import { LayoutSection } from "./sections/LayoutSection";
import { MidiSection } from "./sections/MidiSection";
import { MqttSection } from "./sections/MqttSection";
import { OscSection } from "./sections/OscSection";
import type { InspectorSection } from "./shared";

function InspectorSectionContent({
  section,
  control,
  compact = false,
}: {
  section: InspectorSection;
  control: Control;
  compact?: boolean;
}) {
  switch (section) {
    case "general":
      return <GeneralSection control={control} compact={compact} />;
    case "layout":
      return <LayoutSection control={control} compact={compact} />;
    case "osc":
      return <OscSection control={control} compact={compact} />;
    case "midi":
      return <MidiSection control={control} compact={compact} />;
    case "mqtt":
      return <MqttSection control={control} compact={compact} />;
  }
}

export function ControlInspector({ control }: { control: Control }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [section, setSection] = useState<InspectorSection>("general");
  const [expanded, setExpanded] = useState<InspectorSection | false>("general");

  const sections: { id: InspectorSection; label: string }[] = [
    { id: "general", label: t("control.general") },
    { id: "layout", label: t("control.layout") },
    { id: "osc", label: t("protocols.osc") },
    { id: "midi", label: t("protocols.midi") },
    { id: "mqtt", label: t("protocols.mqtt") },
  ];

  if (isMobile) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "auto",
          px: 2,
          py: 1.5,
        }}
      >
        <Stack spacing={1}>
          {sections.map((item) => (
            <Accordion
              key={item.id}
              expanded={expanded === item.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? item.id : false)}
              disableGutters
              elevation={0}
              sx={stackedAccordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">{item.label}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <InspectorSectionContent section={item.id} control={control} compact />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}
    >
      <SettingsSectionNav
        sections={sections}
        section={section}
        onSelect={setSection}
        sidebarWidth={148}
      />
      <Box sx={{ flex: 1, minWidth: 0, overflow: "auto", px: 2.5, py: 2 }}>
        <InspectorSectionContent section={section} control={control} />
      </Box>
    </Box>
  );
}
