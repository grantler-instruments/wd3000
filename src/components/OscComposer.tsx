import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SendIcon from "@mui/icons-material/Send";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { usePointerReorder } from "../hooks/usePointerReorder";
import {
  defaultOscComposerArg,
  formatOscMessageSummary,
  toOscArgPayload,
  type OscComposerArg,
} from "../lib/oscMessages";
import { sendOscMessage } from "../lib/output";
import { isNativeApp } from "../lib/platform";
import {
  OSC_ARG_TYPES,
  type OscArgType,
  oscArgTypeLabel,
  oscArgTypeRequiresValue,
} from "../lib/oscTypes";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";

interface OscComposerArgRow extends OscComposerArg {
  id: string;
}

function createArgRow(): OscComposerArgRow {
  return {
    id: crypto.randomUUID(),
    ...defaultOscComposerArg(),
  };
}

function isIncompleteFloat(raw: string) {
  return (
    raw === "" ||
    raw === "-" ||
    raw === "." ||
    raw === "-." ||
    raw.endsWith(".")
  );
}

function useFloatField(value: number, onChange: (value: number) => void) {
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    setInput(raw);
    if (isIncompleteFloat(raw)) {
      return;
    }
    const num = Number.parseFloat(raw);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = Number.parseFloat(input);
    const next = Number.isNaN(num) ? 0 : num;
    onChange(next);
    setInput(String(next));
  };

  return { input, handleChange, handleBlur };
}

function useIntField(value: number, onChange: (value: number) => void) {
  const [input, setInput] = useState(String(value));

  useEffect(() => {
    setInput(String(value));
  }, [value]);

  const handleChange = (raw: string) => {
    setInput(raw);
    if (raw === "" || raw === "-") {
      return;
    }
    const num = Number.parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = Number.parseInt(input, 10);
    const next = Number.isNaN(num) ? 0 : num;
    onChange(next);
    setInput(String(next));
  };

  return { input, handleChange, handleBlur };
}

function OscArgRow({
  arg,
  index,
  canRemove,
  canReorder,
  dragging,
  dragOver,
  onChange,
  onRemove,
  onDragStart,
}: {
  arg: OscComposerArgRow;
  index: number;
  canRemove: boolean;
  canReorder: boolean;
  dragging: boolean;
  dragOver: boolean;
  onChange: (arg: OscComposerArgRow) => void;
  onRemove: () => void;
  onDragStart: () => void;
}) {
  const floatField = useFloatField(arg.floatValue, (floatValue) =>
    onChange({ ...arg, floatValue }),
  );
  const intField = useIntField(arg.intValue, (intValue) =>
    onChange({ ...arg, intValue }),
  );

  return (
    <Stack
      direction="row"
      spacing={1}
      data-reorder-id={arg.id}
      sx={{
        alignItems: "center",
        opacity: dragging ? 0.55 : 1,
        outline: dragOver ? 2 : 0,
        outlineColor: "primary.main",
        outlineOffset: 2,
        borderRadius: 1,
      }}
    >
      <Box
        aria-label={`Reorder argument ${index + 1}`}
        role="button"
        tabIndex={canReorder ? 0 : -1}
        onPointerDown={(event) => {
          if (!canReorder || event.button !== 0) {
            return;
          }
          event.preventDefault();
          onDragStart();
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          flexShrink: 0,
          cursor: canReorder ? "grab" : "default",
          color: canReorder ? "text.secondary" : "action.disabled",
          borderRadius: 1,
          touchAction: "none",
          userSelect: "none",
          "&:active": {
            cursor: canReorder ? "grabbing" : "default",
          },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 20, textAlign: "right" }}
      >
        {index + 1}
      </Typography>

      <FormControl size="small" sx={{ width: 140 }}>
        <InputLabel id={`osc-composer-type-label-${arg.id}`}>Type</InputLabel>
        <Select
          labelId={`osc-composer-type-label-${arg.id}`}
          label="Type"
          value={arg.type}
          onChange={(event) =>
            onChange({ ...arg, type: event.target.value as OscArgType })
          }
        >
          {OSC_ARG_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {oscArgTypeLabel(type)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {arg.type === "float" && (
        <TextField
          label="Value"
          size="small"
          value={floatField.input}
          onChange={(event) => floatField.handleChange(event.target.value)}
          onBlur={floatField.handleBlur}
          inputMode="decimal"
          placeholder="0.5"
          sx={{ width: 120 }}
        />
      )}

      {arg.type === "int" && (
        <TextField
          label="Value"
          size="small"
          value={intField.input}
          onChange={(event) => intField.handleChange(event.target.value)}
          onBlur={intField.handleBlur}
          inputMode="numeric"
          placeholder="0"
          sx={{ width: 120 }}
        />
      )}

      {arg.type === "string" && (
        <TextField
          label="Value"
          size="small"
          value={arg.stringValue}
          onChange={(event) =>
            onChange({ ...arg, stringValue: event.target.value })
          }
          placeholder="hello"
          sx={{ width: 220 }}
        />
      )}

      {!oscArgTypeRequiresValue(arg.type) && (
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
          No value payload
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      <IconButton
        size="small"
        aria-label={`Remove argument ${index + 1}`}
        onClick={onRemove}
        disabled={!canRemove}
      >
        <DeleteOutlinedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

export function OscComposer() {
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const setLastError = useAppStore((state) => state.setLastError);
  const native = isNativeApp();

  const [host, setHost] = useState(output.oscHost);
  const [port, setPort] = useState(output.oscPort);
  const [address, setAddress] = useState("/test");
  const [args, setArgs] = useState<OscComposerArgRow[]>(() => [createArgRow()]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setHost(output.oscHost);
    setPort(output.oscPort);
  }, [output.oscHost, output.oscPort]);

  const updateArg = (id: string, next: OscComposerArgRow) => {
    setArgs((current) => current.map((arg) => (arg.id === id ? next : arg)));
  };

  const removeArg = (id: string) => {
    setArgs((current) => current.filter((arg) => arg.id !== id));
  };

  const reorderArgs = (sourceId: string, targetId: string) => {
    setArgs((current) => {
      const sourceIndex = current.findIndex((arg) => arg.id === sourceId);
      const targetIndex = current.findIndex((arg) => arg.id === targetId);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const { draggingId, overId, startDrag } = usePointerReorder(reorderArgs);

  const handleSend = async () => {
    setSending(true);
    try {
      const trimmedAddress = address.trim();
      const payloads = args.map(toOscArgPayload);
      await sendOscMessage(
        host.trim(),
        port,
        trimmedAddress,
        payloads,
        formatOscMessageSummary(trimmedAddress, args),
      );
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <DebuggerSection title="Composer">
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            label="Address"
            size="small"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="/test"
            sx={{ width: 220 }}
          />

          <Box sx={{ flex: 1 }} />

          <TextField
            label="Host"
            size="small"
            value={host}
            onChange={(event) => {
              const nextHost = event.target.value;
              setHost(nextHost);
              setOutput({ oscHost: nextHost });
            }}
            sx={{ width: 140 }}
          />
          <TextField
            label="Port"
            size="small"
            type="number"
            value={port}
            onChange={(event) => {
              const nextPort = Number(event.target.value) || 9000;
              setPort(nextPort);
              setOutput({ oscPort: nextPort });
            }}
            sx={{ width: 96 }}
          />

          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
            disabled={
              !native ||
              sending ||
              !host.trim() ||
              !address.trim() ||
              args.length === 0
            }
            sx={{ flexShrink: 0 }}
          >
            Send
          </Button>
        </Stack>

        {args.map((arg, index) => (
          <OscArgRow
            key={arg.id}
            arg={arg}
            index={index}
            canRemove={args.length > 1}
            canReorder={args.length > 1}
            dragging={draggingId === arg.id}
            dragOver={overId === arg.id && draggingId !== arg.id}
            onChange={(next) => updateArg(arg.id, next)}
            onRemove={() => removeArg(arg.id)}
            onDragStart={() => startDrag(arg.id)}
          />
        ))}

        <Box>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setArgs((current) => [...current, createArgRow()])}
            disabled={!native}
          >
            Add argument
          </Button>
        </Box>
      </Stack>
    </DebuggerSection>
  );
}
