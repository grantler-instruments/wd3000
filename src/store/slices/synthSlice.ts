import type { StateCreator } from "zustand";
import { DEFAULT_RHODES_PARAMS, type RhodesParams } from "../../audio/instruments/Rhodes";
import {
  DEFAULT_SYNTH_PARAMS,
  type SynthParams,
  type Waveform,
} from "../../audio/instruments/Synth";
import { type InstrumentType, isInstrumentType } from "../../audio/instruments/types";
import type { AppStore } from "../appStoreTypes";

export type SynthConfig = {
  instrument: InstrumentType;
  midiChannel: number;
  masterGain: number;
  midiInputPortName: string | null;
  oscListenPort: number;
  oscAddressPrefix: string;
  params: SynthParams;
  rhodesParams: RhodesParams;
};

export const DEFAULT_SYNTH_CONFIG: SynthConfig = {
  instrument: "rhodes",
  midiChannel: 0,
  masterGain: 0.8,
  midiInputPortName: null,
  oscListenPort: 9001,
  oscAddressPrefix: "/synth",
  params: { ...DEFAULT_SYNTH_PARAMS },
  rhodesParams: { ...DEFAULT_RHODES_PARAMS },
};

export interface SynthSlice {
  synthConfig: SynthConfig;
  synthRunning: boolean;
  setSynthRunning: (running: boolean) => void;
  setSynthInstrument: (instrument: InstrumentType) => void;
  setSynthMidiChannel: (channel: number) => void;
  setSynthMasterGain: (gain: number) => void;
  setSynthMidiInputPortName: (portName: string | null) => void;
  setSynthOscListenPort: (port: number) => void;
  setSynthOscAddressPrefix: (prefix: string) => void;
  setSynthParam: <K extends keyof SynthParams>(key: K, value: SynthParams[K]) => void;
  setSynthWaveform: (osc: "A" | "B" | "C", waveform: Waveform) => void;
  setRhodesParam: <K extends keyof RhodesParams>(key: K, value: RhodesParams[K]) => void;
}

export function normalizeSynthConfig(value?: Partial<SynthConfig>): SynthConfig {
  const defaults = DEFAULT_SYNTH_CONFIG;
  if (!value) {
    return {
      ...defaults,
      params: { ...defaults.params },
      rhodesParams: { ...defaults.rhodesParams },
    };
  }

  return {
    instrument: isInstrumentType(value.instrument) ? value.instrument : defaults.instrument,
    midiChannel:
      typeof value.midiChannel === "number"
        ? Math.min(16, Math.max(0, Math.round(value.midiChannel)))
        : defaults.midiChannel,
    masterGain:
      typeof value.masterGain === "number"
        ? Math.min(1, Math.max(0, value.masterGain))
        : defaults.masterGain,
    midiInputPortName:
      typeof value.midiInputPortName === "string" && value.midiInputPortName.trim()
        ? value.midiInputPortName.trim()
        : null,
    oscListenPort:
      typeof value.oscListenPort === "number" && value.oscListenPort > 0
        ? Math.round(value.oscListenPort)
        : defaults.oscListenPort,
    oscAddressPrefix:
      typeof value.oscAddressPrefix === "string" && value.oscAddressPrefix.trim()
        ? value.oscAddressPrefix.trim()
        : defaults.oscAddressPrefix,
    params: { ...defaults.params, ...value.params },
    rhodesParams: { ...defaults.rhodesParams, ...value.rhodesParams },
  };
}

export const createSynthSlice: StateCreator<AppStore, [], [], SynthSlice> = (set) => ({
  synthConfig: normalizeSynthConfig(),
  synthRunning: false,
  setSynthRunning: (running) => set({ synthRunning: running }),
  setSynthInstrument: (instrument) =>
    set((state) => ({
      synthConfig: { ...state.synthConfig, instrument },
    })),
  setSynthMidiChannel: (channel) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        midiChannel: Math.min(16, Math.max(0, Math.round(channel))),
      },
    })),
  setSynthMasterGain: (gain) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        masterGain: Math.min(1, Math.max(0, gain)),
      },
    })),
  setSynthMidiInputPortName: (portName) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        midiInputPortName: portName?.trim() || null,
      },
    })),
  setSynthOscListenPort: (port) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        oscListenPort: Math.max(0, Math.round(port)),
      },
    })),
  setSynthOscAddressPrefix: (prefix) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        oscAddressPrefix: prefix.trim() || "/synth",
      },
    })),
  setSynthParam: (key, value) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        params: { ...state.synthConfig.params, [key]: value },
      },
    })),
  setSynthWaveform: (osc, waveform) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        params: {
          ...state.synthConfig.params,
          [`waveform${osc}`]: waveform,
        },
      },
    })),
  setRhodesParam: (key, value) =>
    set((state) => ({
      synthConfig: {
        ...state.synthConfig,
        rhodesParams: { ...state.synthConfig.rhodesParams, [key]: value },
      },
    })),
});
