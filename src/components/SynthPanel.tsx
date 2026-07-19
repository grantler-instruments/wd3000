import PianoIcon from "@mui/icons-material/Piano";
import StopIcon from "@mui/icons-material/Stop";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RhodesParams } from "../audio/instruments/Rhodes";
import type { Waveform } from "../audio/instruments/Synth";
import { INSTRUMENT_TYPES, type InstrumentType } from "../audio/instruments/types";
import {
  getSynthRuntimeSnapshot,
  startSynthRuntime,
  stopSynthRuntime,
  subscribeSynthRuntime,
  synthNoteOff,
  synthNoteOn,
} from "../audio/synthRuntime";
import { listMidiInputs } from "../lib/input";
import { isNativeApp } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";
import { NativeOnlyAlert } from "./NativeOnlyAlert";

const WAVEFORMS: Waveform[] = ["sine", "saw", "square", "triangle"];
const KEYBOARD_NOTES = [60, 62, 64, 65, 67, 69, 71, 72];

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption">{value.toFixed(step < 0.01 ? 3 : 2)}</Typography>
      </Stack>
      <Slider
        size="small"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, next) => onChange(typeof next === "number" ? next : next[0])}
      />
    </Box>
  );
}

export function SynthPanel() {
  const { t } = useTranslation();
  const nativeApp = isNativeApp();
  const synthConfig = useAppStore((state) => state.synthConfig);
  const synthRunning = useAppStore((state) => state.synthRunning);
  const setSynthRunning = useAppStore((state) => state.setSynthRunning);
  const setSynthInstrument = useAppStore((state) => state.setSynthInstrument);
  const setSynthMidiChannel = useAppStore((state) => state.setSynthMidiChannel);
  const setSynthMasterGain = useAppStore((state) => state.setSynthMasterGain);
  const setSynthMidiInputPortName = useAppStore((state) => state.setSynthMidiInputPortName);
  const setSynthOscListenPort = useAppStore((state) => state.setSynthOscListenPort);
  const setSynthOscAddressPrefix = useAppStore((state) => state.setSynthOscAddressPrefix);
  const setSynthParam = useAppStore((state) => state.setSynthParam);
  const setSynthWaveform = useAppStore((state) => state.setSynthWaveform);
  const setRhodesParam = useAppStore((state) => state.setRhodesParam);
  const setLastError = useAppStore((state) => state.setLastError);

  const [midiInputs, setMidiInputs] = useState<string[]>([]);
  const [heldNotes, setHeldNotes] = useState<Set<number>>(() => new Set());
  const [starting, setStarting] = useState(() => getSynthRuntimeSnapshot().status === "starting");

  useEffect(() => {
    void listMidiInputs()
      .then(setMidiInputs)
      .catch(() => setMidiInputs([]));
  }, []);

  useEffect(() => {
    return subscribeSynthRuntime(() => {
      setStarting(getSynthRuntimeSnapshot().status === "starting");
    });
  }, []);

  const handleToggleEngine = async () => {
    if (synthRunning || starting) {
      setSynthRunning(false);
      await stopSynthRuntime();
      return;
    }

    setStarting(true);
    setSynthRunning(true);
    try {
      await startSynthRuntime({
        instrument: synthConfig.instrument,
        midiChannel: synthConfig.midiChannel,
        masterGain: synthConfig.masterGain,
        params: synthConfig.params,
        rhodesParams: synthConfig.rhodesParams,
      });
    } catch (error) {
      setSynthRunning(false);
      setLastError(error instanceof Error ? error.message : String(error));
    }
  };

  const channelOptions = useMemo(
    () => [
      { value: 0, label: t("synth.omni") },
      ...Array.from({ length: 16 }, (_, index) => ({
        value: index + 1,
        label: String(index + 1),
      })),
    ],
    [t],
  );

  const handlePadDown = (note: number) => {
    if (!synthRunning) {
      return;
    }
    synthNoteOn(synthConfig.midiChannel === 0 ? 1 : synthConfig.midiChannel, note, 100);
    setHeldNotes((prev) => new Set(prev).add(note));
  };

  const handlePadUp = (note: number) => {
    synthNoteOff(synthConfig.midiChannel === 0 ? 1 : synthConfig.midiChannel, note);
    setHeldNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
      <Stack spacing={3} sx={{ maxWidth: 720, mx: "auto", width: "100%" }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <PianoIcon fontSize="small" color="action" />
            <Typography variant="h6">{t("synth.title")}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t("synth.description")}
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: "stretch" }}>
          <Button
            variant="contained"
            color={synthRunning ? "inherit" : "primary"}
            startIcon={synthRunning ? <StopIcon /> : <PianoIcon />}
            onClick={() => void handleToggleEngine()}
            disabled={starting}
            sx={{ minWidth: 160 }}
          >
            {starting ? t("synth.starting") : synthRunning ? t("common.stop") : t("common.start")}
          </Button>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ alignSelf: { sm: "center" }, flex: 1 }}
          >
            {synthRunning ? t("synth.runningHint") : t("synth.startHint")}
          </Typography>
        </Stack>

        <Stack spacing={2}>
          <Typography variant="subtitle2">{t("synth.io")}</Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="synth-midi-in">{t("synth.midiInput")}</InputLabel>
            <Select
              labelId="synth-midi-in"
              label={t("synth.midiInput")}
              value={synthConfig.midiInputPortName ?? ""}
              onChange={(event) => setSynthMidiInputPortName(event.target.value || null)}
            >
              <MenuItem value="">
                <em>{t("common.none")}</em>
              </MenuItem>
              {midiInputs.map((port) => (
                <MenuItem key={port} value={port}>
                  {port}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="synth-midi-ch">{t("common.channel")}</InputLabel>
            <Select
              labelId="synth-midi-ch"
              label={t("common.channel")}
              value={synthConfig.midiChannel}
              onChange={(event) => setSynthMidiChannel(Number(event.target.value))}
            >
              {channelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {nativeApp ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                size="small"
                type="number"
                label={t("common.listenPort")}
                value={synthConfig.oscListenPort}
                onChange={(event) => setSynthOscListenPort(Number(event.target.value) || 0)}
                fullWidth
              />
              <TextField
                size="small"
                label={t("synth.oscPrefix")}
                value={synthConfig.oscAddressPrefix}
                onChange={(event) => setSynthOscAddressPrefix(event.target.value)}
                fullWidth
                helperText={t("synth.oscHint")}
              />
            </Stack>
          ) : (
            <NativeOnlyAlert protocol="osc" />
          )}
        </Stack>

        <Stack spacing={2}>
          <Typography variant="subtitle2">{t("synth.voice")}</Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="synth-instrument">{t("synth.instrument")}</InputLabel>
            <Select
              labelId="synth-instrument"
              label={t("synth.instrument")}
              value={synthConfig.instrument}
              onChange={(event) => setSynthInstrument(event.target.value as InstrumentType)}
            >
              {INSTRUMENT_TYPES.map((instrument) => (
                <MenuItem key={instrument} value={instrument}>
                  {t(`synth.instruments.${instrument}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ParamSlider
            label={t("synth.masterGain")}
            value={synthConfig.masterGain}
            min={0}
            max={1}
            step={0.01}
            onChange={setSynthMasterGain}
          />

          {synthConfig.instrument === "rhodes" ? (
            (
              [
                ["attack", 0, 0.5, 0.001],
                ["decay", 0, 5, 0.01],
                ["sustain", 0, 1, 0.01],
                ["release", 0, 5, 0.01],
                ["bell", 0, 200, 1],
                ["bellRatio", 2, 8, 0.01],
                ["filterCutoff", 500, 12000, 10],
                ["filterEnv", 0, 1, 0.01],
                ["tremoloRate", 0, 12, 0.1],
                ["tremoloDepth", 0, 1, 0.01],
                ["drive", 0.5, 4, 0.01],
              ] as const
            ).map(([key, min, max, step]) => (
              <ParamSlider
                key={key}
                label={t(`synth.rhodes.${key}`)}
                value={synthConfig.rhodesParams[key as keyof RhodesParams]}
                min={min}
                max={max}
                step={step}
                onChange={(value) => setRhodesParam(key as keyof RhodesParams, value)}
              />
            ))
          ) : (
            <>
              <ParamSlider
                label={t("synth.attack")}
                value={synthConfig.params.attack}
                min={0.001}
                max={2}
                step={0.001}
                onChange={(value) => setSynthParam("attack", value)}
              />
              <ParamSlider
                label={t("synth.decay")}
                value={synthConfig.params.decay}
                min={0.001}
                max={2}
                step={0.001}
                onChange={(value) => setSynthParam("decay", value)}
              />
              <ParamSlider
                label={t("synth.sustain")}
                value={synthConfig.params.sustain}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => setSynthParam("sustain", value)}
              />
              <ParamSlider
                label={t("synth.release")}
                value={synthConfig.params.release}
                min={0.001}
                max={4}
                step={0.001}
                onChange={(value) => setSynthParam("release", value)}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {(["A", "B", "C"] as const).map((osc) => (
                  <FormControl key={osc} fullWidth size="small">
                    <InputLabel id={`synth-wave-${osc}`}>{t("synth.waveform", { osc })}</InputLabel>
                    <Select
                      labelId={`synth-wave-${osc}`}
                      label={t("synth.waveform", { osc })}
                      value={synthConfig.params[`waveform${osc}`]}
                      onChange={(event) => setSynthWaveform(osc, event.target.value as Waveform)}
                    >
                      {WAVEFORMS.map((waveform) => (
                        <MenuItem key={waveform} value={waveform}>
                          {waveform}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Stack>
            </>
          )}
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">{t("synth.testKeyboard")}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {KEYBOARD_NOTES.map((note) => (
              <Button
                key={note}
                variant={heldNotes.has(note) ? "contained" : "outlined"}
                disabled={!synthRunning}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  handlePadDown(note);
                }}
                onPointerUp={() => handlePadUp(note)}
                onPointerCancel={() => handlePadUp(note)}
                sx={{ minWidth: 48 }}
              >
                {note}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
