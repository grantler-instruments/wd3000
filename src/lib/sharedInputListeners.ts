import { invoke } from "@tauri-apps/api/core";
import { isNativeApp } from "./platform";
import { startWebMidiInput, stopWebMidiInput } from "./webMidi";

export type InputListenerOwner = "performer" | "synth";

type ListenerNeed = {
  oscListenPort: number;
  midiInputPortName: string | null;
};

const needs = new Map<InputListenerOwner, ListenerNeed>();
let reconcileChain = Promise.resolve();

function pickNeed(): ListenerNeed | null {
  // Performer play-mode wins when both need ports; otherwise use synth.
  const performer = needs.get("performer");
  const synth = needs.get("synth");

  if (!performer && !synth) {
    return null;
  }

  return {
    oscListenPort: performer?.oscListenPort || synth?.oscListenPort || 0,
    midiInputPortName: performer?.midiInputPortName || synth?.midiInputPortName || null,
  };
}

async function stopAll(): Promise<void> {
  if (isNativeApp()) {
    await invoke("stop_input_listeners");
    return;
  }
  await stopWebMidiInput();
}

async function startAll(need: ListenerNeed): Promise<void> {
  if (isNativeApp()) {
    await invoke("start_input_listeners", {
      oscListenPort: need.oscListenPort,
      midiInputPortName: need.midiInputPortName,
    });
    return;
  }

  if (!need.midiInputPortName) {
    await stopWebMidiInput();
    return;
  }

  await startWebMidiInput(need.midiInputPortName);
}

async function reconcile(): Promise<void> {
  const need = pickNeed();
  if (!need || (!need.oscListenPort && !need.midiInputPortName)) {
    await stopAll();
    return;
  }

  await startAll(need);
}

function enqueueReconcile(): Promise<void> {
  reconcileChain = reconcileChain.then(reconcile).catch((error) => {
    console.error("Shared input listener reconcile failed:", error);
  });
  return reconcileChain;
}

export function setInputListenerNeed(owner: InputListenerOwner, need: ListenerNeed): Promise<void> {
  needs.set(owner, need);
  return enqueueReconcile();
}

export function clearInputListenerNeed(owner: InputListenerOwner): Promise<void> {
  needs.delete(owner);
  return enqueueReconcile();
}
