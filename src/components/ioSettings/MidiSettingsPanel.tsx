import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listMidiInputs } from "../../lib/input";
import { listMidiOutputs } from "../../lib/output";
import {
  closeVirtualMidiInput,
  closeVirtualMidiOutput,
  createVirtualMidiInput,
  createVirtualMidiOutput,
  listVirtualMidiPorts,
  nextVirtualMidiPortName,
  supportsVirtualMidi,
  type VirtualMidiPorts,
} from "../../lib/virtualMidi";
import { useAppStore } from "../../store/useAppStore";
import type { MidiInputEndpoint, MidiOutputEndpoint } from "../../types";
import { EmptyState, EndpointCard, SubsectionHeader } from "./shared";

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

export function MidiSettingsPanel() {
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
