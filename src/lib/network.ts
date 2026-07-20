import { invoke } from "@tauri-apps/api/core";

export async function getLocalIp(): Promise<string | null> {
  return invoke<string | null>("get_local_ip");
}

/** Clamp to a valid TCP/UDP port, or return `fallback` if out of range / non-finite. */
export function clampPort(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1 || value > 65535) {
    return fallback;
  }
  return Math.round(value);
}
