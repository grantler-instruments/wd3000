import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Box,
  Button,
  Chip,
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
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listMidiInputs } from "../lib/input";
import { listMidiOutputs } from "../lib/output";
import {
  closeVirtualMidiInput,
  closeVirtualMidiOutput,
  createVirtualMidiInput,
  createVirtualMidiOutput,
  listVirtualMidiPorts,
  nextVirtualMidiPortName,
  supportsVirtualMidi,
  type VirtualMidiPorts,
} from "../lib/virtualMidi";
import { useAppStore } from "../store/useAppStore";
import type {
  MidiInputEndpoint,
  MidiOutputEndpoint,
  MqttConnection,
  OscReceiver,
  OscSender,
} from "../types";
import { LanguageSelect } from "./LanguageSelect";
import { SettingsSectionNav } from "./SettingsSectionNav";

type IoSettingsSection = "general" | "osc" | "midi" | "mqtt";

function useIoSections() {
  const { t } = useTranslation();
  return [
    { id: "general" as const, label: t("control.general") },
    { id: "osc" as const, label: t("protocols.osc") },
    { id: "midi" as const, label: t("protocols.midi") },
    { id: "mqtt" as const, label: t("protocols.mqtt") },
  ];
}

function GeneralSettingsPanel() {
  const { t } = useTranslation();

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {t("control.general")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("settings.generalDescription")}
        </Typography>
      </Box>
      <LanguageSelect />
    </Stack>
  );
}

function SubsectionHeader({
  title,
  description,
  onAdd,
  addLabel,
  secondaryAddLabel,
  onSecondaryAdd,
  secondaryAddDisabled,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
  secondaryAddLabel?: string;
  onSecondaryAdd?: () => void;
  secondaryAddDisabled?: boolean;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        alignItems: { xs: "stretch", sm: "flex-start" },
        justifyContent: "space-between",
        mb: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          flexShrink: 0,
          alignSelf: { xs: "flex-start", sm: "auto" },
          mt: { xs: 0, sm: 0.25 },
          flexWrap: "wrap",
        }}
      >
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>
          {addLabel}
        </Button>
        {secondaryAddLabel && onSecondaryAdd ? (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={onSecondaryAdd}
            disabled={secondaryAddDisabled}
          >
            {secondaryAddLabel}
          </Button>
        ) : null}
      </Stack>
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
  const { t } = useTranslation();
  const updateMqttConnection = useAppStore((state) => state.updateMqttConnection);
  const removeMqttConnection = useAppStore((state) => state.removeMqttConnection);

  return (
    <EndpointCard
      onRemove={() => removeMqttConnection(connection.id)}
      removeLabel={t("common.removeNamed", { name: connection.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={connection.name}
          onChange={(event) => updateMqttConnection(connection.id, { name: event.target.value })}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id={`mqtt-protocol-${connection.id}`}>{t("common.protocol")}</InputLabel>
          <Select
            labelId={`mqtt-protocol-${connection.id}`}
            label={t("common.protocol")}
            value={connection.protocol}
            onChange={(event) =>
              updateMqttConnection(connection.id, {
                protocol: event.target.value as MqttConnection["protocol"],
              })
            }
          >
            <MenuItem value="tcp">{t("protocols.tcp")}</MenuItem>
            <MenuItem value="ws">{t("protocols.ws")}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={t("common.host")}
          size="small"
          fullWidth
          value={connection.host}
          onChange={(event) => updateMqttConnection(connection.id, { host: event.target.value })}
        />
        <TextField
          label={t("common.port")}
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
  const { t } = useTranslation();
  const updateOscSender = useAppStore((state) => state.updateOscSender);
  const removeOscSender = useAppStore((state) => state.removeOscSender);

  return (
    <EndpointCard
      onRemove={() => removeOscSender(sender.id)}
      removeLabel={t("common.removeNamed", { name: sender.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={sender.name}
          onChange={(event) => updateOscSender(sender.id, { name: event.target.value })}
        />
        <TextField
          label={t("common.host")}
          size="small"
          fullWidth
          value={sender.host}
          onChange={(event) => updateOscSender(sender.id, { host: event.target.value })}
        />
        <TextField
          label={t("common.port")}
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
  const { t } = useTranslation();
  const updateOscReceiver = useAppStore((state) => state.updateOscReceiver);
  const removeOscReceiver = useAppStore((state) => state.removeOscReceiver);

  return (
    <EndpointCard
      onRemove={() => removeOscReceiver(receiver.id)}
      removeLabel={t("common.removeNamed", { name: receiver.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={receiver.name}
          onChange={(event) => updateOscReceiver(receiver.id, { name: event.target.value })}
        />
        <TextField
          label={t("common.listenPort")}
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

function MidiOutputRow({ endpoint, ports }: { endpoint: MidiOutputEndpoint; ports: string[] }) {
  const { t } = useTranslation();
  const updateMidiOutput = useAppStore((state) => state.updateMidiOutput);
  const removeMidiOutput = useAppStore((state) => state.removeMidiOutput);

  return (
    <EndpointCard
      onRemove={() => removeMidiOutput(endpoint.id)}
      removeLabel={t("common.removeNamed", { name: endpoint.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={endpoint.name}
          onChange={(event) => updateMidiOutput(endpoint.id, { name: event.target.value })}
        />
        <FormControl fullWidth size="small">
          <InputLabel id={`midi-out-${endpoint.id}`}>{t("common.port")}</InputLabel>
          <Select
            labelId={`midi-out-${endpoint.id}`}
            label={t("common.port")}
            value={endpoint.portName}
            onChange={(event) => updateMidiOutput(endpoint.id, { portName: event.target.value })}
          >
            {ports.length === 0 && (
              <MenuItem value="" disabled>
                {t("io.noOutputsFound")}
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

function MidiInputRow({ endpoint, ports }: { endpoint: MidiInputEndpoint; ports: string[] }) {
  const { t } = useTranslation();
  const updateMidiInput = useAppStore((state) => state.updateMidiInput);
  const removeMidiInput = useAppStore((state) => state.removeMidiInput);

  return (
    <EndpointCard
      onRemove={() => removeMidiInput(endpoint.id)}
      removeLabel={t("common.removeNamed", { name: endpoint.name })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label={t("common.name")}
          size="small"
          fullWidth
          value={endpoint.name}
          onChange={(event) => updateMidiInput(endpoint.id, { name: event.target.value })}
        />
        <FormControl fullWidth size="small">
          <InputLabel id={`midi-in-${endpoint.id}`}>{t("common.port")}</InputLabel>
          <Select
            labelId={`midi-in-${endpoint.id}`}
            label={t("common.port")}
            value={endpoint.portName}
            onChange={(event) => updateMidiInput(endpoint.id, { portName: event.target.value })}
          >
            {ports.length === 0 && (
              <MenuItem value="" disabled>
                {t("io.noInputsFound")}
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
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const addOscSender = useAppStore((state) => state.addOscSender);
  const addOscReceiver = useAppStore((state) => state.addOscReceiver);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t("protocols.osc")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("io.oscIntro")}
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.senders")}
          description={t("io.sendersDescription")}
          addLabel={t("io.addSender")}
          onAdd={() =>
            addOscSender({
              name: t("io.defaultOscSender", { n: performerIo.oscSenders.length + 1 }),
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscSenders.length === 0 ? (
            <EmptyState message={t("io.noSenders")} />
          ) : (
            performerIo.oscSenders.map((sender) => <OscSenderRow key={sender.id} sender={sender} />)
          )}
        </Stack>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.receivers")}
          description={t("io.receiversDescription")}
          addLabel={t("io.addReceiver")}
          onAdd={() =>
            addOscReceiver({
              name: t("io.defaultOscReceiver", { n: performerIo.oscReceivers.length + 1 }),
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.oscReceivers.length === 0 ? (
            <EmptyState message={t("io.noReceivers")} />
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

function VirtualMidiPortRow({ name, onRemove }: { name: string; onRemove: () => void }) {
  const { t } = useTranslation();

  return (
    <EndpointCard onRemove={onRemove} removeLabel={t("common.removeNamed", { name })}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
        <Chip size="small" label={t("io.virtual")} />
        <Typography
          variant="body2"
          sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {name}
        </Typography>
      </Stack>
    </EndpointCard>
  );
}

function MidiSettingsPanel() {
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const addMidiOutput = useAppStore((state) => state.addMidiOutput);
  const addMidiInput = useAppStore((state) => state.addMidiInput);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const midiInputPorts = useAppStore((state) => state.midiInputPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setMidiInputPorts = useAppStore((state) => state.setMidiInputPorts);
  const setLastError = useAppStore((state) => state.setLastError);
  const [virtualSupported, setVirtualSupported] = useState(false);
  const [virtualPorts, setVirtualPorts] = useState<VirtualMidiPorts>({
    outputs: [],
    inputs: [],
  });
  const [virtualBusy, setVirtualBusy] = useState(false);

  const refreshSystemPorts = () => {
    void Promise.all([listMidiOutputs(), listMidiInputs()])
      .then(([outputs, inputs]) => {
        setMidiPorts(outputs);
        setMidiInputPorts(inputs);
      })
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  };

  const refreshVirtualPorts = useCallback(async () => {
    const next = await listVirtualMidiPorts();
    setVirtualPorts(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supportsVirtualMidi()
      .then(async (value) => {
        if (cancelled) {
          return;
        }
        setVirtualSupported(value);
        if (value) {
          await refreshVirtualPorts();
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setVirtualSupported(false);
          setLastError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVirtualPorts, setLastError]);

  const createVirtualPort = async (direction: "output" | "input") => {
    setVirtualBusy(true);
    try {
      if (direction === "output") {
        await createVirtualMidiOutput(
          nextVirtualMidiPortName(virtualPorts.outputs, t("io.defaultVirtualMidiOutput")),
        );
      } else {
        await createVirtualMidiInput(
          nextVirtualMidiPortName(virtualPorts.inputs, t("io.defaultVirtualMidiInput")),
        );
      }
      await refreshVirtualPorts();
      refreshSystemPorts();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setVirtualBusy(false);
    }
  };

  const closeVirtualPort = async (direction: "output" | "input", name: string) => {
    setVirtualBusy(true);
    try {
      if (direction === "output") {
        await closeVirtualMidiOutput(name);
      } else {
        await closeVirtualMidiInput(name);
      }
      await refreshVirtualPorts();
      refreshSystemPorts();
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setVirtualBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t("protocols.midi")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("io.midiIntro")}
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.outputs")}
          description={t("io.outputsDescription")}
          addLabel={t("io.addOutput")}
          onAdd={() =>
            addMidiOutput({
              name: t("io.defaultMidiOutput", { n: performerIo.midiOutputs.length + 1 }),
              portName: midiPorts[0] ?? "",
            })
          }
          secondaryAddLabel={virtualSupported ? t("io.addVirtualOutput") : undefined}
          onSecondaryAdd={virtualSupported ? () => void createVirtualPort("output") : undefined}
          secondaryAddDisabled={virtualBusy}
        />
        <Stack spacing={1}>
          {virtualPorts.outputs.map((name) => (
            <VirtualMidiPortRow
              key={`virtual-out:${name}`}
              name={name}
              onRemove={() => void closeVirtualPort("output", name)}
            />
          ))}
          {performerIo.midiOutputs.length === 0 && virtualPorts.outputs.length === 0 ? (
            <EmptyState message={t("io.noOutputs")} />
          ) : (
            performerIo.midiOutputs.map((endpoint) => (
              <MidiOutputRow key={endpoint.id} endpoint={endpoint} ports={midiPorts} />
            ))
          )}
        </Stack>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.inputs")}
          description={t("io.inputsDescription")}
          addLabel={t("io.addInput")}
          onAdd={() =>
            addMidiInput({
              name: t("io.defaultMidiInput", { n: performerIo.midiInputs.length + 1 }),
              portName: midiInputPorts[0] ?? "",
            })
          }
          secondaryAddLabel={virtualSupported ? t("io.addVirtualInput") : undefined}
          onSecondaryAdd={virtualSupported ? () => void createVirtualPort("input") : undefined}
          secondaryAddDisabled={virtualBusy}
        />
        <Stack spacing={1}>
          {virtualPorts.inputs.map((name) => (
            <VirtualMidiPortRow
              key={`virtual-in:${name}`}
              name={name}
              onRemove={() => void closeVirtualPort("input", name)}
            />
          ))}
          {performerIo.midiInputs.length === 0 && virtualPorts.inputs.length === 0 ? (
            <EmptyState message={t("io.noInputs")} />
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
  const { t } = useTranslation();
  const performerIo = useAppStore((state) => state.performerIo);
  const output = useAppStore((state) => state.output);
  const addMqttConnection = useAppStore((state) => state.addMqttConnection);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {t("protocols.mqtt")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("io.mqttIntro")}
        </Typography>
      </Box>

      <Box>
        <SubsectionHeader
          title={t("io.brokers")}
          description={t("io.brokersDescription")}
          addLabel={t("io.addBroker")}
          onAdd={() =>
            addMqttConnection({
              name: t("io.defaultMqtt", { n: performerIo.mqttConnections.length + 1 }),
              host: output.mqttComposerHost,
              port: output.mqttComposerPort,
              protocol: output.mqttComposerProtocol,
            })
          }
        />
        <Stack spacing={1}>
          {performerIo.mqttConnections.length === 0 ? (
            <EmptyState message={t("io.noBrokers")} />
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
