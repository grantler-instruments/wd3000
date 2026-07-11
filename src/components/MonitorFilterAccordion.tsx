import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { MonitorLogProtocol } from "../lib/monitorLog";
import type { MonitorMidiPortFilterState } from "../lib/monitorMidiPortFilter";
import type { MonitorMidiTypeFilterState } from "../lib/monitorMidiFilter";
import {
  isMonitorFilterActive,
  type MonitorDirectionFilterState,
} from "../lib/monitorLogFilter";
import { MonitorDirectionFilter } from "./MonitorDirectionFilter";
import { MonitorMidiPortFilter } from "./MonitorMidiPortFilter";
import { MonitorMidiTypeFilter } from "./MonitorMidiTypeFilter";
import { stackedAccordionSx } from "./stackedAccordionSx";

interface MonitorFilterAccordionProps {
  protocol: MonitorLogProtocol;
  directionFilter: MonitorDirectionFilterState;
  onDirectionFilterChange: (value: MonitorDirectionFilterState) => void;
  midiTypeFilter?: MonitorMidiTypeFilterState;
  onMidiTypeFilterChange?: (value: MonitorMidiTypeFilterState) => void;
  midiPortFilter?: MonitorMidiPortFilterState;
  onMidiPortFilterChange?: (value: MonitorMidiPortFilterState) => void;
  midiPorts?: string[];
}

export function MonitorFilterAccordion({
  protocol,
  directionFilter,
  onDirectionFilterChange,
  midiTypeFilter,
  onMidiTypeFilterChange,
  midiPortFilter,
  onMidiPortFilterChange,
  midiPorts = [],
}: MonitorFilterAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const filtersActive = isMonitorFilterActive(
    directionFilter,
    midiTypeFilter,
    midiPortFilter,
  );

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={stackedAccordionSx}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="subtitle2">Filters</Typography>
          {filtersActive && (
            <Chip label="Active" size="small" color="primary" variant="outlined" />
          )}
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Direction
            </Typography>
            <MonitorDirectionFilter
              value={directionFilter}
              onChange={onDirectionFilterChange}
            />
          </Stack>

          {protocol === "midi" && midiTypeFilter && onMidiTypeFilterChange && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                MIDI type
              </Typography>
              <MonitorMidiTypeFilter
                value={midiTypeFilter}
                onChange={onMidiTypeFilterChange}
              />
            </Stack>
          )}

          {protocol === "midi" && midiPortFilter !== undefined && onMidiPortFilterChange && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Device
              </Typography>
              <MonitorMidiPortFilter
                ports={midiPorts}
                value={midiPortFilter}
                onChange={onMidiPortFilterChange}
              />
            </Stack>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
