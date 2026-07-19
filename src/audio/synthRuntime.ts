import WebRenderer from "@elemaudio/web-renderer";
import { Engine } from "./Engine";
import type { RhodesParams } from "./instruments/Rhodes";
import { DEFAULT_SYNTH_PARAMS, type SynthParams } from "./instruments/Synth";
import type { InstrumentType } from "./instruments/types";

export type SynthRuntimeStatus = "idle" | "starting" | "running" | "error";

type RuntimeListener = () => void;

let ctx: AudioContext | null = null;
let core: WebRenderer | null = null;
let engine: Engine | null = null;
let renderChain = Promise.resolve();
let status: SynthRuntimeStatus = "idle";
let lastError: string | null = null;
let startGeneration = 0;
const listeners = new Set<RuntimeListener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setStatus(next: SynthRuntimeStatus, error: string | null = null): void {
  status = next;
  lastError = error;
  notify();
}

async function commitRender(activeCore: WebRenderer, active: Engine): Promise<void> {
  const mainOut = active.render();
  await activeCore.render(mainOut, mainOut);
}

function queueRender(): void {
  if (!engine || !core) {
    return;
  }
  const active = engine;
  const activeCore = core;
  renderChain = renderChain
    .then(() => commitRender(activeCore, active))
    .catch((error) => {
      console.error("Synth render failed:", error);
    });
}

export function subscribeSynthRuntime(listener: RuntimeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSynthRuntimeSnapshot() {
  return {
    status,
    lastError,
    running: status === "running",
  };
}

export function getSynthEngine(): Engine | null {
  return engine;
}

async function disposeAudioResources(): Promise<void> {
  engine?.allNotesOff();
  engine = null;
  core = null;

  if (ctx) {
    try {
      await ctx.close();
    } catch {
      // ignore close errors
    }
    ctx = null;
  }
}

export async function startSynthRuntime(options: {
  instrument: InstrumentType;
  midiChannel: number;
  masterGain: number;
  params: SynthParams;
  rhodesParams: RhodesParams;
}): Promise<void> {
  if (status === "running") {
    return;
  }

  // Cancel any in-flight start (double-clicks).
  const generation = ++startGeneration;
  setStatus("starting");

  try {
    await disposeAudioResources();

    if (generation !== startGeneration) {
      return;
    }

    const nextCore = new WebRenderer();
    const nextCtx = new AudioContext();
    if (nextCtx.state === "suspended") {
      await nextCtx.resume();
    }

    if (generation !== startGeneration) {
      await nextCtx.close().catch(() => undefined);
      return;
    }

    const node = await nextCore.initialize(nextCtx, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    if (generation !== startGeneration) {
      await nextCtx.close().catch(() => undefined);
      return;
    }

    node.connect(nextCtx.destination);

    const nextEngine = new Engine(nextCore, {
      instrument: options.instrument,
      midiChannel: options.midiChannel,
      masterGain: options.masterGain,
      synthParams: options.params,
      rhodesParams: options.rhodesParams,
      onRequestRender: queueRender,
    });
    await commitRender(nextCore, nextEngine);

    if (generation !== startGeneration) {
      await nextCtx.close().catch(() => undefined);
      return;
    }

    core = nextCore;
    ctx = nextCtx;
    engine = nextEngine;
    setStatus("running");
  } catch (error) {
    if (generation !== startGeneration) {
      return;
    }
    await disposeAudioResources();
    setStatus("error", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function stopSynthRuntime(): Promise<void> {
  startGeneration += 1;
  await disposeAudioResources();
  if (status !== "idle") {
    setStatus("idle");
  }
}

export function synthNoteOn(channel: number, note: number, velocity: number): void {
  engine?.noteOn(channel, note, velocity);
}

export function synthNoteOff(channel: number, note: number): void {
  engine?.noteOff(channel, note);
}

export function synthAllNotesOff(): void {
  engine?.allNotesOff();
}

export async function synthSetMasterGain(gain: number): Promise<void> {
  await engine?.setMasterGain(gain);
}

export async function synthSetParams(partial: Partial<SynthParams>): Promise<void> {
  await engine?.setSynthParams(partial);
}

export async function synthSetRhodesParams(partial: Partial<RhodesParams>): Promise<void> {
  await engine?.setRhodesParams(partial);
}

export async function synthSetInstrument(instrument: InstrumentType): Promise<void> {
  if (!engine || !core) {
    return;
  }
  if (!engine.setInstrument(instrument)) {
    return;
  }
  await commitRender(core, engine);
}

export function synthSetMidiChannel(channel: number): void {
  engine?.setMidiChannel(channel);
}

export function defaultSynthParams(): SynthParams {
  return { ...DEFAULT_SYNTH_PARAMS };
}
