import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { MediaPipeLandmark } from "../../lib/mediapipe/types";
import {
  defaultMediaPipeLandmarkMapping,
  formatMediaPipeLandmarkKey,
  normalizeMediaPipeLandmarkMapping,
} from "../../lib/mediapipe/types";
import { useAppStore } from "../../store/useAppStore";
import { endpointLabel } from "../../types";

function MappingProtocolSection({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Stack spacing={enabled ? 1.5 : 0}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="subtitle2">{label}</Typography>
        <Switch
          size="small"
          checked={enabled}
          onChange={(_, checked) => onToggle(checked)}
          aria-label={`${enabled ? "Disable" : "Enable"} ${label}`}
        />
      </Stack>
      {enabled ? <Stack spacing={1}>{children}</Stack> : null}
    </Stack>
  );
}

function formatValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(3);
}

export function LandmarkMappingEditor({
  mappingKey,
  liveValue,
}: {
  mappingKey: string;
  liveValue?: MediaPipeLandmark;
}) {
  const [expanded, setExpanded] = useState(false);
  const storedMapping = useAppStore((state) => state.mediapipeMappings[mappingKey]);
  const performerIo = useAppStore((state) => state.performerIo);
  const updateMediaPipeLandmarkMapping = useAppStore(
    (state) => state.updateMediaPipeLandmarkMapping,
  );
  const mapping = useMemo(
    () =>
      storedMapping
        ? normalizeMediaPipeLandmarkMapping(storedMapping, performerIo, mappingKey)
        : defaultMediaPipeLandmarkMapping(mappingKey, performerIo),
    [mappingKey, performerIo, storedMapping],
  );

  const title = formatMediaPipeLandmarkKey(mappingKey);
  const liveSummary = `${formatValue(liveValue?.x)} / ${formatValue(liveValue?.y)} / ${formatValue(liveValue?.z)}`;
  const activeOutputs = [
    mapping.osc.enabled ? "OSC" : null,
    mapping.mqtt.enabled ? "MQTT" : null,
    mapping.midi.enabled ? "MIDI" : null,
  ].filter((label): label is string => label !== null);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            pr: 1,
            minWidth: 0,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", minWidth: 0, flex: 1 }}
          >
            <Typography variant="subtitle2" noWrap>
              {title}
            </Typography>
            {activeOutputs.map((label) => (
              <Chip key={label} label={label} size="small" variant="outlined" />
            ))}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
          >
            {liveSummary}
          </Typography>
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              x / y / z
            </Typography>
            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {liveSummary}
            </Typography>
          </Stack>

          <Divider />

          <Typography variant="caption" color="text.secondary">
            Outputs
          </Typography>

          <Stack spacing={1.5}>
            <MappingProtocolSection
              label="OSC"
              enabled={mapping.osc.enabled}
              onToggle={(enabled) =>
                updateMediaPipeLandmarkMapping(mappingKey, { osc: { enabled } })
              }
            >
              <FormControl fullWidth size="small">
                <InputLabel id={`${mappingKey}-osc-sender-label`}>Sender</InputLabel>
                <Select
                  labelId={`${mappingKey}-osc-sender-label`}
                  label="Sender"
                  value={mapping.osc.senderId ?? ""}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      osc: { senderId: event.target.value || null },
                    })
                  }
                >
                  {performerIo.oscSenders.length === 0 && (
                    <MenuItem value="" disabled>
                      Add senders in I/O settings
                    </MenuItem>
                  )}
                  {performerIo.oscSenders.map((sender) => (
                    <MenuItem key={sender.id} value={sender.id}>
                      {endpointLabel(sender.name, `${sender.host}:${sender.port}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Address"
                size="small"
                value={mapping.osc.address}
                onChange={(event) =>
                  updateMediaPipeLandmarkMapping(mappingKey, {
                    osc: { address: event.target.value },
                  })
                }
              />
            </MappingProtocolSection>

            <MappingProtocolSection
              label="MQTT"
              enabled={mapping.mqtt.enabled}
              onToggle={(enabled) =>
                updateMediaPipeLandmarkMapping(mappingKey, { mqtt: { enabled } })
              }
            >
              <FormControl fullWidth size="small">
                <InputLabel id={`${mappingKey}-mqtt-connection-label`}>Broker</InputLabel>
                <Select
                  labelId={`${mappingKey}-mqtt-connection-label`}
                  label="Broker"
                  value={mapping.mqtt.connectionId ?? ""}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      mqtt: { connectionId: event.target.value || null },
                    })
                  }
                >
                  {performerIo.mqttConnections.length === 0 && (
                    <MenuItem value="" disabled>
                      Add brokers in I/O settings
                    </MenuItem>
                  )}
                  {performerIo.mqttConnections.map((connection) => (
                    <MenuItem key={connection.id} value={connection.id}>
                      {endpointLabel(
                        connection.name,
                        `${connection.protocol}://${connection.host}:${connection.port}`,
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Topic"
                size="small"
                value={mapping.mqtt.topic}
                onChange={(event) =>
                  updateMediaPipeLandmarkMapping(mappingKey, {
                    mqtt: { topic: event.target.value },
                  })
                }
              />
            </MappingProtocolSection>

            <MappingProtocolSection
              label="MIDI"
              enabled={mapping.midi.enabled}
              onToggle={(enabled) =>
                updateMediaPipeLandmarkMapping(mappingKey, { midi: { enabled } })
              }
            >
              <FormControl fullWidth size="small">
                <InputLabel id={`${mappingKey}-midi-output-label`}>Output</InputLabel>
                <Select
                  labelId={`${mappingKey}-midi-output-label`}
                  label="Output"
                  value={mapping.midi.outputId ?? ""}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      midi: { outputId: event.target.value || null },
                    })
                  }
                >
                  {performerIo.midiOutputs.length === 0 && (
                    <MenuItem value="" disabled>
                      Add outputs in I/O settings
                    </MenuItem>
                  )}
                  {performerIo.midiOutputs.map((endpoint) => (
                    <MenuItem key={endpoint.id} value={endpoint.id}>
                      {endpointLabel(endpoint.name, endpoint.portName)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Channel"
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 1, max: 16 } }}
                  value={mapping.midi.channel}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      midi: { channel: Number(event.target.value) || 1 },
                    })
                  }
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="X CC"
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, max: 127 } }}
                  value={mapping.midi.xCc}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      midi: { xCc: Number(event.target.value) || 0 },
                    })
                  }
                />
                <TextField
                  label="Y CC"
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, max: 127 } }}
                  value={mapping.midi.yCc}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      midi: { yCc: Number(event.target.value) || 0 },
                    })
                  }
                />
                <TextField
                  label="Z CC"
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, max: 127 } }}
                  value={mapping.midi.zCc}
                  onChange={(event) =>
                    updateMediaPipeLandmarkMapping(mappingKey, {
                      midi: { zCc: Number(event.target.value) || 0 },
                    })
                  }
                />
              </Stack>
            </MappingProtocolSection>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
