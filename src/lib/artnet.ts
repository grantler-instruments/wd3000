import { invoke } from "@tauri-apps/api/core";
import { pushDebugLog, recordOutboundArtNetDebug } from "./debugLog";

export const ARTNET_DEFAULT_PORT = 6454;

export interface ArtNetDebugPayload {
  universe: number;
  sequence: number;
  physical: number;
  channelCount: number;
  channels: number[];
}

export function formatArtNetSummary(payload: {
  universe: number;
  sequence: number;
  physical?: number;
  channels: number[];
}) {
  const channelCount = payload.channels.length;
  const preview = formatChannelPreview(payload.channels, 8);
  const physical = payload.physical ?? 0;
  return `Universe ${payload.universe} seq ${payload.sequence} phys ${physical} [${channelCount} ch] ${preview}`;
}

function formatChannelPreview(channels: number[], max: number) {
  const parts = channels
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => value !== 0)
    .slice(0, max)
    .map(({ value, index }) => `ch${index + 1}=${value}`);

  if (parts.length === 0) {
    return "all zero";
  }

  const nonZero = channels.filter((value) => value !== 0).length;
  if (nonZero > max) {
    parts.push(`+${nonZero - max} more`);
  }

  return parts.join(" ");
}

export async function startArtNetListener(port: number | null): Promise<void> {
  await invoke("start_artnet_listener", { port: port ?? 0 });
}

export async function stopArtNetListener(): Promise<void> {
  await invoke("stop_artnet_listener");
}

export async function sendArtNetDmx(
  host: string,
  port: number,
  universe: number,
  sequence: number,
  channels: number[],
  summary?: string,
) {
  const normalized = channels.map((value) =>
    Math.min(255, Math.max(0, Math.round(value))),
  );

  if (normalized.length === 0) {
    throw new Error("At least one DMX channel value is required");
  }

  await invoke("send_artnet_dmx", {
    host,
    port,
    universe,
    sequence,
    channels: normalized,
  });

  const payload: ArtNetDebugPayload = {
    universe,
    sequence,
    physical: 0,
    channelCount: normalized.length,
    channels: normalized,
  };
  const logSummary = summary ?? formatArtNetSummary(payload);
  recordOutboundArtNetDebug(logSummary);
  pushDebugLog({
    direction: "out",
    kind: "artnet",
    summary: logSummary,
    payload,
  });
}
