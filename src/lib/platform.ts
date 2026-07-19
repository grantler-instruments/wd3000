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

/** True for phone/tablet browsers (incl. iPadOS with desktop UA). Not viewport-based. */
export function isMobileBrowserDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  if (/android|iphone|ipod|ipad/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ reports as Macintosh but has multi-touch.
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) {
    return true;
  }

  return false;
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

export function formatDeleteKey(): string {
  const usesMeta =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return usesMeta ? "⌫" : "Del";
}

export function formatRedoKey(): string {
  const usesMeta =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return usesMeta ? "⇧⌘Z" : "Ctrl+Shift+Z";
}

export function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
