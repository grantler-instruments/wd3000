import SendIcon from "@mui/icons-material/Send";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PITCH_BEND_CENTER,
  PITCH_BEND_MAX,
  PITCH_BEND_MIN,
  defaultMidiComposerParams,
  encodeMidiComposerMessage,
  formatMidiComposerSummary,
  getMidiComposerDebugKind,
} from "../lib/midiMessages";
import {
  MIDI_COMPOSER_TYPES,
  type MidiComposerType,
  midiComposerRequiresChannel,
} from "../lib/midiTypes";
import { listMidiOutputs, sendMidiRaw } from "../lib/output";
import { isNativeApp, isWebMidiSupported } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { DebuggerSection } from "./DebuggerSection";

const MIDI_COMPOSER_TYPE_KEYS: Record<MidiComposerType, string> = {
  "note-on": "midiComposer.noteOn",
  "note-off": "midiComposer.noteOff",
  cc: "midiComposer.controlChange",
  "program-change": "midiComposer.programChange",
  "pitch-bend": "midiComposer.pitchBend",
  "channel-pressure": "midiComposer.aftertouch",
  "poly-pressure": "midiComposer.polyAftertouch",
  sysex: "midiComposer.sysex",
  start: "midiKinds.start",
  stop: "midiKinds.stop",
  continue: "midiKinds.continue",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function useNumberField(
  value: number,
  onChange: (value: number) => void,
  min: number,
  max: number,
) {
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
      onChange(clamp(num, min, max));
    }
  };

  const handleBlur = () => {
    const num = Number.parseInt(input, 10);
    const clamped = Number.isNaN(num) ? min : clamp(num, min, max);
    onChange(clamped);
    setInput(String(clamped));
  };

  return { input, handleChange, handleBlur };
}

export function MidiComposer() {
  const { t } = useTranslation();
  const output = useAppStore((state) => state.output);
  const setOutput = useAppStore((state) => state.setOutput);
  const midiPorts = useAppStore((state) => state.midiPorts);
  const setMidiPorts = useAppStore((state) => state.setMidiPorts);
  const setLastError = useAppStore((state) => state.setLastError);

  const [portName, setPortName] = useState(output.midiPortName ?? "");
  const [messageType, setMessageType] = useState<MidiComposerType>("note-on");
  const [params, setParams] = useState(defaultMidiComposerParams);
  const [sending, setSending] = useState(false);

  const noteOrCcField = useNumberField(
    params.noteOrCc,
    (value) => setParams((current) => ({ ...current, noteOrCc: value })),
    0,
    127,
  );
  const velocityField = useNumberField(
    params.velocityOrValue,
    (value) => setParams((current) => ({ ...current, velocityOrValue: value })),
    0,
    127,
  );
  const pitchBendField = useNumberField(
    params.pitchBendSigned,
    (value) => setParams((current) => ({ ...current, pitchBendSigned: value })),
    PITCH_BEND_MIN,
    PITCH_BEND_MAX,
  );

  const showChannel = midiComposerRequiresChannel(messageType);
  const showNoteOrCc =
    messageType === "note-on" ||
    messageType === "note-off" ||
    messageType === "poly-pressure" ||
    messageType === "cc" ||
    messageType === "program-change";
  const showVelocityOrValue =
    messageType === "note-on" ||
    messageType === "note-off" ||
    messageType === "poly-pressure" ||
    messageType === "cc" ||
    messageType === "channel-pressure";

  useEffect(() => {
    listMidiOutputs()
      .then((outputs) => {
        setMidiPorts(outputs);
        setPortName((current) => current || output.midiPortName || outputs[0] || "");
      })
      .catch((error) => {
        setLastError(error instanceof Error ? error.message : String(error));
      });
  }, [output.midiPortName, setLastError, setMidiPorts]);

  const noteOrCcLabel =
    messageType === "cc"
      ? t("midiComposer.controller")
      : messageType === "program-change"
        ? t("midiComposer.program")
        : t("common.note");

  const velocityLabel =
    messageType === "note-on" || messageType === "note-off"
      ? t("common.velocity")
      : t("common.value");

  const handleSend = async () => {
    if (!portName) {
      setLastError(t("monitor.selectMidiOutput"));
      return;
    }

    setSending(true);

    try {
      const bytes = encodeMidiComposerMessage(messageType, params);
      const summary = formatMidiComposerSummary(messageType, params, bytes);
      await sendMidiRaw(
        portName,
        bytes,
        getMidiComposerDebugKind(messageType),
        summary,
      );
      setLastError(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  if (!isNativeApp() && !isWebMidiSupported()) {
    return (
      <DebuggerSection title={t("monitor.composer")}>
        <Alert severity="warning">{t("monitor.webMidiOutputUnsupported")}</Alert>
      </DebuggerSection>
    );
  }

  if (midiPorts.length === 0) {
    return (
      <DebuggerSection title={t("monitor.composer")}>
        <Alert severity="warning">{t("monitor.noMidiOutputs")}</Alert>
      </DebuggerSection>
    );
  }

  return (
    <DebuggerSection title={t("monitor.composer")}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {showChannel && (
          <FormControl size="small" sx={{ width: 96 }}>
            <InputLabel id="midi-composer-channel-label">{t("common.channel")}</InputLabel>
            <Select
              labelId="midi-composer-channel-label"
              label={t("common.channel")}
              value={params.channel}
              onChange={(event) =>
                setParams((current) => ({
                  ...current,
                  channel: Number(event.target.value),
                }))
              }
            >
              {Array.from({ length: 16 }, (_, index) => index + 1).map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel id="midi-composer-type-label">{t("common.type")}</InputLabel>
          <Select
            labelId="midi-composer-type-label"
            label={t("common.type")}
            value={messageType}
            onChange={(event) => setMessageType(event.target.value as MidiComposerType)}
          >
            {MIDI_COMPOSER_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {t(MIDI_COMPOSER_TYPE_KEYS[type])}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {messageType === "sysex" && (
          <>
            <TextField
              label={t("midiKinds.start")}
              value="F0"
              disabled
              size="small"
              sx={{ width: 72 }}
            />
            <TextField
              label={t("midiComposer.manufacturer")}
              value={params.manufacturerId}
              onChange={(event) =>
                setParams((current) => ({
                  ...current,
                  manufacturerId: event.target.value.toUpperCase(),
                }))
              }
              placeholder="FD"
              size="small"
              sx={{ width: 120 }}
            />
            <TextField
              label={t("midiComposer.data")}
              value={params.sysexData.replace(/\s+/g, "").toUpperCase()}
              onChange={(event) =>
                setParams((current) => ({
                  ...current,
                  sysexData: event.target.value,
                }))
              }
              placeholder="43 12 00"
              size="small"
              sx={{ width: 220 }}
            />
            <TextField
              label={t("midiComposer.end")}
              value="F7"
              disabled
              size="small"
              sx={{ width: 72 }}
            />
          </>
        )}

        {showNoteOrCc && (
          <TextField
            label={noteOrCcLabel}
            value={noteOrCcField.input}
            onChange={(event) => noteOrCcField.handleChange(event.target.value)}
            onBlur={noteOrCcField.handleBlur}
            inputMode="numeric"
            size="small"
            sx={{ width: 104 }}
          />
        )}

        {showVelocityOrValue && (
          <TextField
            label={velocityLabel}
            value={velocityField.input}
            onChange={(event) => velocityField.handleChange(event.target.value)}
            onBlur={velocityField.handleBlur}
            inputMode="numeric"
            size="small"
            sx={{ width: 104 }}
          />
        )}

        {messageType === "pitch-bend" && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 40, textAlign: "right" }}
            >
              {PITCH_BEND_MIN}
            </Typography>
            <TextField
              label={t("midiComposer.bend")}
              value={pitchBendField.input}
              onChange={(event) => pitchBendField.handleChange(event.target.value)}
              onBlur={pitchBendField.handleBlur}
              inputMode="numeric"
              size="small"
              placeholder={String(PITCH_BEND_CENTER)}
              sx={{ width: 88 }}
              slotProps={{
                htmlInput: { min: PITCH_BEND_MIN, max: PITCH_BEND_MAX },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
              +{PITCH_BEND_MAX}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("midiComposer.bendCenter")}
            </Typography>
          </Stack>
        )}

        <Box sx={{ flex: 1 }} />

        <FormControl size="small" sx={{ minWidth: 200, maxWidth: 320 }}>
          <InputLabel id="midi-composer-device-label">{t("common.device")}</InputLabel>
          <Select
            labelId="midi-composer-device-label"
            label={t("common.device")}
            value={portName}
            onChange={(event) => {
              const nextPort = event.target.value;
              setPortName(nextPort);
              setOutput({ midiPortName: nextPort || null });
            }}
          >
            {midiPorts.map((port) => (
              <MenuItem key={port} value={port}>
                {port}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={handleSend}
          disabled={sending || !portName}
          sx={{ flexShrink: 0 }}
        >
          {t("common.send")}
        </Button>
      </Stack>
    </DebuggerSection>
  );
}
