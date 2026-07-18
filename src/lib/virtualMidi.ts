import { invoke } from "@tauri-apps/api/core";
import { isNativeApp } from "./platform";

export interface VirtualMidiPorts {
  outputs: string[];
  inputs: string[];
}

export async function supportsVirtualMidi(): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }

  return invoke<boolean>("supports_virtual_midi");
}

export async function listVirtualMidiPorts(): Promise<VirtualMidiPorts> {
  if (!isNativeApp()) {
    return { outputs: [], inputs: [] };
  }

  return invoke<VirtualMidiPorts>("list_virtual_midi_ports");
}

export async function createVirtualMidiOutput(portName: string): Promise<void> {
  await invoke("create_virtual_midi_output", { portName });
}

export async function createVirtualMidiInput(portName: string): Promise<void> {
  await invoke("create_virtual_midi_input", { portName });
}

export async function closeVirtualMidiOutput(portName: string): Promise<void> {
  await invoke("close_virtual_midi_output", { portName });
}

export async function closeVirtualMidiInput(portName: string): Promise<void> {
  await invoke("close_virtual_midi_input", { portName });
}

export function nextVirtualMidiPortName(existing: string[], base: string): string {
  const names = new Set(existing.map((name) => name.trim().toLowerCase()));
  if (!names.has(base.toLowerCase())) {
    return base;
  }

  let index = 2;
  while (names.has(`${base} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${base} ${index}`;
}
