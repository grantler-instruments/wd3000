import { isTauri } from "@tauri-apps/api/core";

export type AppPlatform = "browser" | "desktop" | "mobile";

export function isNativeApp(): boolean {
  return isTauri();
}

export function getAppPlatform(): AppPlatform {
  if (!isTauri()) {
    return "browser";
  }

  const ua = navigator.userAgent;
  if (/android/i.test(ua)) {
    return "mobile";
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

export function isWebMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

export function formatShortcutKey(key: string): string {
  const usesMeta =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return usesMeta ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}
