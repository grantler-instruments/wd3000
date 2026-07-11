import { invoke } from "@tauri-apps/api/core";

export async function getLocalIp(): Promise<string | null> {
  return invoke<string | null>("get_local_ip");
}
