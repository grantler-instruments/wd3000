import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { listMidiInputs } from "../lib/input";
import { listMidiOutputs } from "../lib/output";
import { useAppStore } from "../store/useAppStore";
import { SettingsSectionNav } from "./SettingsSectionNav";
import type {
  MidiInputEndpoint,
  MidiOutputEndpoint,
  MqttConnection,
  OscReceiver,
  OscSender,
} from "../types";

type IoSettingsSection = "osc" | "midi" | "mqtt";

const SECTIONS: { id: IoSettingsSection; label: string }[] = [
  { id: "osc", label: "OSC" },
  { id: "midi", label: "MIDI" },
  { id: "mqtt", label: "MQTT" },
];

function SubsectionHeader({
  title,
  description,
  onAdd,
  addLabel,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{ alignItems: { xs: "stretch", sm: "flex-start" }, justifyContent: "space-between", mb: 1.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={onAdd}
        sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "auto" }, mt: { xs: 0, sm: 0.25 } }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 2.5,
        bgcolor: "action.hover",
        borderStyle: "dashed",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Paper>
  );
}

function EndpointCard({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1.25,
        display: "flex",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <IconButton size="small" aria-label={removeLabel} onClick={onRemove} sx={{ flexShrink: 0 }}>
        <DeleteOutlinedIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}

function MqttConnectionRow({ connection }: { connection: MqttConnection }) {
  const updateMqttConnection = useAppStore((state) => state.updateMqttConnection);
  const removeMqttConnection = useAppStore((state) => state.removeMqttConnection);

  return (
    <EndpointCard
      onRemove={() => removeMqttConnection(connection.id)}
      removeLabel={`Remove ${connection.name}`}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={connection.name}
          onChange={(event) =>
            updateMqttConnection(connection.id, { name: event.target.value })
          }
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id={`mqtt-protocol-${connection.id}`}>Protocol</InputLabel>
          <Select
            labelId={`mqtt-protocol-${connection.id}`}
            label="Protocol"
            value={connection.protocol}
            onChange={(event) =>
              updateMqttConnection(connection.id, {
                protocol: event.target.value as MqttConnection["protocol"],
              })
            }
          >
            <MenuItem value="tcp">TCP</MenuItem>
            <MenuItem value="ws">WS</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Host"
          size="small"
          fullWidth
          value={connection.host}
          onChange={(event) =>
            updateMqttConnection(connection.id, { host: event.target.value })
          }
        />
        <TextField
          label="Port"
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 100 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={connection.port}
          onChange={(event) =>
            updateMqttConnection(connection.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

function OscSenderRow({ sender }: { sender: OscSender }) {
  const updateOscSender = useAppStore((state) => state.updateOscSender);
  const removeOscSender = useAppStore((state) => state.removeOscSender);

  return (
    <EndpointCard
      onRemove={() => removeOscSender(sender.id)}
      removeLabel={`Remove ${sender.name}`}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={sender.name}
          onChange={(event) => updateOscSender(sender.id, { name: event.target.value })}
        />
        <TextField
          label="Host"
          size="small"
          fullWidth
          value={sender.host}
          onChange={(event) => updateOscSender(sender.id, { host: event.target.value })}
        />
        <TextField
          label="Port"
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 100 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={sender.port}
          onChange={(event) =>
            updateOscSender(sender.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

function OscReceiverRow({ receiver }: { receiver: OscReceiver }) {
  const updateOscReceiver = useAppStore((state) => state.updateOscReceiver);
  const removeOscReceiver = useAppStore((state) => state.removeOscReceiver);

  return (
    <EndpointCard
      onRemove={() => removeOscReceiver(receiver.id)}
      removeLabel={`Remove ${receiver.name}`}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={receiver.name}
          onChange={(event) => updateOscReceiver(receiver.id, { name: event.target.value })}
        />
        <TextField
          label="Listen port"
          size="small"
          type="number"
          sx={{ width: { xs: "100%", sm: 140 }, flexShrink: 0 }}
          slotProps={{ htmlInput: { min: 1, max: 65535 } }}
          value={receiver.port}
          onChange={(event) =>
            updateOscReceiver(receiver.id, {
              port: Math.min(65535, Math.max(1, Number(event.target.value) || 1)),
            })
          }
        />
      </Stack>
    </EndpointCard>
  );
}

function MidiOutputRow({
  endpoint,
  ports,
}: {
  endpoint: MidiOutputEndpoint;
  ports: string[];
}) {
  const updateMidiOutput = useAppStore((state) => state.updateMidiOutput);
  const removeMidiOutput = useAppStore((state) => state.removeMidiOutput);

  return (
    <EndpointCard
      onRemove={() => removeMidiOutput(endpoint.id)}
      removeLabel={`Remove ${endpoint.name}`}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={endpoint.name}
          onChange={(event) => updateMidiOutput(endpoint.id, { name: event.target.value })}
        />
        <FormControl fullWidth size="small">
          <InputLabel id={`midi-out-${endpoint.id}`}>Port</InputLabel>
          <Select
            labelId={`midi-out-${endpoint.id}`}
            label="Port"
            value={endpoint.portName}
            onChange={(event) =>
              updateMidiOutput(endpoint.id, { portName: event.target.value })
            }
          >
            {ports.length === 0 && (
              <MenuItem value="" disabled>
                No outputs found
              </MenuItem>
            )}
            {ports.map((port) => (
              <MenuItem key={port} value={port}>
                {port}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </EndpointCard>
  );
}

function MidiInputRow({
  endpoint,
  ports,
}: {
  endpoint: MidiInputEndpoint;
  ports: string[];
}) {
  const updateMidiInput = useAppStore((state) => state.updateMidiInput);
  const removeMidiInput = useAppStore((state) => state.removeMidiInput);

  return (
    <EndpointCard
      onRemove={() => removeMidiInput(endpoint.id)}
      removeLabel={`Remove ${endpoint.name}`}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={endpoint.name}
          onChange={(event) => updateMidiInput(endpoint.id, { name: event.target.value })}
        />
        <FormControl fullWidth size="small">
          <InputLabel id={`midi-in-${endpoint.id}`}>Port</InputLabel>
          <Select
            labelId={`midi-in-${endpoint.id}`}
            label="Port"
            value={endpoint.portName}
            onChange={(event) =>
              updateMidiInput(endpoint.id, { portName: event.target.value })
            }
          >
            {ports.length === 0 && (
              <MenuItem value="" disabled>
                No inputs found
              </MenuItem>
            )}
            {ports.map((port) => (
              <MenuItem key={port} value={port}>
                {port}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </EndpointCard>
  );
}

function OscSettingsPanel() {
  const performerIo = useAppStore((state) => state.performerIo);
  const addOscSender = useAppStore((state) => state.addOscSender);
  const addOscReceiver = useAppStore((state) => state.addOscReceiver);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          OSC
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Named send and receive endpoints. Assign them to widgets in the editor.
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title="Senders"
          description="Where widgets send messages."
          addLabel="Add sender"
          onAdd={() =>
            addOscSender({
              name: `OSC ${performerIo.oscSenders.length + 1}`,
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscSenders.length === 0 ? (
            <EmptyState message="No senders yet." />
          ) : (
            performerIo.oscSenders.map((sender) => (
              <OscSenderRow key={sender.id} sender={sender} />
            ))
          )}
        </Stack>
      </Box>

      <Box>
        <SubsectionHeader
          title="Receivers"
          description="Ports listened to in play mode."
          addLabel="Add receiver"
          onAdd={() =>
            addOscReceiver({
              name: `OSC In ${performerIo.oscReceivers.length + 1}`,
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscReceivers.length === 0 ? (
            <EmptyState message="No receivers yet." />
          ) : (
            performerIo.oscReceivers.map((receiver) => (
              <OscReceiverRow key={receiver.id} receiver={receiver} />
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

function MidiSettingsPanel() {
  const performerIo = useAppStore((state) => state.performerIo);
  const addMidiOutput = useAppStore((state) => state.addMidiOutput);
  const addMidiInput = useAppStore((state) => state.addMidiInput);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const midiInputPorts = useAppStore((state) => state.midiInputPorts);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          MIDI
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Named input and output ports for widgets and performers.
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title="Outputs"
          description="Ports widgets send notes and CC to."
          addLabel="Add output"
          onAdd={() =>
            addMidiOutput({
              name: `MIDI Out ${performerIo.midiOutputs.length + 1}`,
              portName: midiPorts[0] ?? "",
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.midiOutputs.length === 0 ? (
            <EmptyState message="No outputs yet." />
          ) : (
            performerIo.midiOutputs.map((endpoint) => (
              <MidiOutputRow key={endpoint.id} endpoint={endpoint} ports={midiPorts} />
            ))
          )}
        </Stack>
      </Box>

      <Box>
        <SubsectionHeader
          title="Inputs"
          description="Ports listened to in play mode."
          addLabel="Add input"
          onAdd={() =>
            addMidiInput({
              name: `MIDI In ${performerIo.midiInputs.length + 1}`,
              portName: midiInputPorts[0] ?? "",
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.midiInputs.length === 0 ? (
            <EmptyState message="No inputs yet." />
          ) : (
            performerIo.midiInputs.map((endpoint) => (
              <MidiInputRow key={endpoint.id} endpoint={endpoint} ports={midiInputPorts} />
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

function MqttSettingsPanel() {
  const performerIo = useAppStore((state) => state.performerIo);
  const output = useAppStore((state) => state.output);
  const addMqttConnection = useAppStore((state) => state.addMqttConnection);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          MQTT
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Named broker connections. Assign them to widgets in the editor.
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title="Brokers"
          description="Where widgets publish messages."
          addLabel="Add broker"
          onAdd={() =>
            addMqttConnection({
              name: `MQTT ${performerIo.mqttConnections.length + 1}`,
              host: output.mqttComposerHost,
              port: output.mqttComposerPort,
              protocol: output.mqttComposerProtocol,
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.mqttConnections.length === 0 ? (
            <EmptyState message="No broker connections yet." />
          ) : (
            performerIo.mqttConnections.map((connection) => (
              <MqttConnectionRow key={connection.id} connection={connection} />
            ))
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

export function IoSettingsPanel() {
  const [section, setSection] = useState<IoSettingsSection>("osc");
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
      <SettingsSectionNav sections={SECTIONS} section={section} onSelect={setSection} />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          px: { xs: 2, sm: 3 },
          py: 2.5,
        }}
      >
        {section === "osc" && <OscSettingsPanel />}
        {section === "midi" && <MidiSettingsPanel />}
        {section === "mqtt" && <MqttSettingsPanel />}
      </Box>
    </Box>
  );
}
