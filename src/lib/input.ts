import { invoke } from "@tauri-apps/api/core";
import {
  collectPerformerListenPorts,
  collectPerformerMidiInputPorts,
} from "./performerIo";
import type { Control, OutputConfig, PerformerIoConfig } from "../types";
import { isNativeApp } from "./platform";
import type { MqttListenerOptions } from "./mqtt";
import {
  listWebMidiInputs,
  startWebMidiInput,
  stopWebMidiInput,
} from "./webMidi";

let activeMidiInputPort: string | null = null;

export function getActiveMidiInputPort() {
  return activeMidiInputPort;
}

export async function listMidiInputs(): Promise<string[]> {
  if (isNativeApp()) {
    return invoke<string[]>("list_midi_inputs");
  }

  return listWebMidiInputs();
}

export async function startMidiInput(portName: string | null): Promise<void> {
  activeMidiInputPort = portName?.trim() || null;

  if (isNativeApp()) {
    await invoke("start_midi_input", { portName });
    return;
  }

  await startWebMidiInput(portName);
}

export async function stopMidiInput(): Promise<void> {
  activeMidiInputPort = null;

  if (isNativeApp()) {
    await invoke("stop_midi_input");
    return;
  }

  await stopWebMidiInput();
}

export async function startOscListener(port: number | null): Promise<void> {
  await invoke("start_osc_listener", { port: port ?? 0 });
}

export async function stopOscListener(): Promise<void> {
  await invoke("stop_osc_listener");
}

export async function startArtNetListener(port: number | null): Promise<void> {
  await invoke("start_artnet_listener", { port: port ?? 0 });
}

export async function stopArtNetListener(): Promise<void> {
  await invoke("stop_artnet_listener");
}

export interface ArtNetListenerStatus {
  listening: boolean;
  port: number | null;
}

export async function getArtNetListenerStatus(): Promise<ArtNetListenerStatus> {
  return invoke<ArtNetListenerStatus>("get_artnet_listener_status");
}

export async function startMqttBroker(tcpPort: number, wsPort: number): Promise<void> {
  await invoke("start_mqtt_broker", { tcpPort, wsPort });
}

export async function stopMqttBroker(): Promise<void> {
  await invoke("stop_mqtt_broker");
}

export async function startMqttListener(options: MqttListenerOptions): Promise<void> {
  const topics = options.topics
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0);

  await invoke("start_mqtt_listener", {
    host: options.host,
    port: options.port,
    protocol: options.protocol,
    subscribeTopics: topics,
  });
}

export async function stopMqttListener(): Promise<void> {
  await invoke("stop_mqtt_listener");
}

export async function startInputListeners(output: OutputConfig): Promise<void> {
  if (isNativeApp()) {
    await invoke("start_input_listeners", {
      oscListenPort: output.oscListenPort,
      midiInputPortName: output.midiInputPortName,
    });
    return;
  }

  await startWebMidiInput(output.midiInputPortName);
}

export async function startPerformerInputListeners(
  performerIo: PerformerIoConfig,
  controls: Control[],
): Promise<void> {
  const oscPorts = collectPerformerListenPorts(performerIo, controls);
  const midiPorts = collectPerformerMidiInputPorts(performerIo, controls);

  if (isNativeApp()) {
    await invoke("start_input_listeners", {
      oscListenPort: oscPorts[0] ?? 0,
      midiInputPortName: midiPorts[0] ?? null,
    });
    return;
  }

  await startWebMidiInput(midiPorts[0] ?? null);
}

export async function stopInputListeners(): Promise<void> {
  if (isNativeApp()) {
    await invoke("stop_input_listeners");
    return;
  }

  await stopWebMidiInput();
}
