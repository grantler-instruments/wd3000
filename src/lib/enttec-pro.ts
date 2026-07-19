import { invoke } from "@tauri-apps/api/core";
import { type ArtNetDebugPayload, formatArtNetSummary } from "./artnet";
import { pushDebugLog, recordOutboundArtNetDebug } from "./debugLog";
import { getAppPlatform, isNativeApp } from "./platform";

/** Enttec DMX USB Pro serial protocol (57600 baud). */
export const ENTTEC_PRO_BAUD_RATE = 57600;
export const ENTTEC_PRO_MIN_UNIVERSE = 1;
export const ENTTEC_PRO_MAX_UNIVERSE = 2;
export const ENTTEC_PRO_MAX_CHANNELS = 512;

const DMX_PRO_HEADER_SIZE = 4;
const DMX_PRO_START_MSG = 0x7e;
const DMX_START_CODE = 0;
const DMX_START_CODE_SIZE = 1;
const DMX_PRO_SEND_PACKET = 0x06;
const DMX_PRO_SEND_PACKET2 = 0xa9;
const DMX_PRO_END_MSG = 0xe7;
const DMX_PRO_END_SIZE = 1;

/** FTDI chip used by Enttec DMX USB Pro. */
const ENTTEC_USB_FILTERS: SerialPortFilter[] = [{ usbVendorId: 0x0403 }];

export type DmxTransport = "artnet" | "enttec" | "deemex";

export interface SerialPortOption {
  id: string;
  label: string;
}

export function isWebSerialAvailable(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/** Enttec Pro: desktop Tauri (serialport) or Chromium Web Serial. */
export function canUseEnttecPro(): boolean {
  if (isNativeApp()) {
    return getAppPlatform() === "desktop";
  }
  return isWebSerialAvailable();
}

export function enttecProPacketLabel(universe: number): number | null {
  if (universe === 1) return DMX_PRO_SEND_PACKET;
  if (universe === 2) return DMX_PRO_SEND_PACKET2;
  return null;
}

export function buildEnttecProPacket(universe: number, data: Uint8Array): Uint8Array | null {
  const label = enttecProPacketLabel(universe);
  if (label === null) return null;

  const channelCount = Math.min(data.length, ENTTEC_PRO_MAX_CHANNELS);
  const dataSize = channelCount + DMX_START_CODE_SIZE;
  const packetSize = DMX_PRO_HEADER_SIZE + dataSize + DMX_PRO_END_SIZE;
  const packet = new Uint8Array(packetSize);

  packet[0] = DMX_PRO_START_MSG;
  packet[1] = label;
  packet[2] = dataSize & 0xff;
  packet[3] = (dataSize >> 8) & 0xff;
  packet[4] = DMX_START_CODE;
  packet.set(data.subarray(0, channelCount), 5);
  packet[packetSize - 1] = DMX_PRO_END_MSG;

  return packet;
}

export function formatEnttecComposerSummary(params: {
  universe: number;
  channel: number;
  value: number;
}) {
  return `Enttec U${params.universe} ch ${params.channel} = ${params.value}`;
}

export async function listSerialPorts(): Promise<SerialPortOption[]> {
  return invoke<SerialPortOption[]>("list_serial_ports");
}

export async function connectEnttecProTauri(portId: string): Promise<void> {
  await invoke("connect_enttec_pro", { portId });
}

export async function disconnectEnttecProTauri(): Promise<void> {
  await invoke("disconnect_enttec_pro");
}

export async function isEnttecProConnectedTauri(): Promise<boolean> {
  return invoke<boolean>("is_enttec_pro_connected");
}

async function sendEnttecProTauri(universe: number, channels: number[]): Promise<void> {
  await invoke("send_enttec_pro_dmx", {
    frames: [{ universe, data: channels }],
  });
}

let webPort: SerialPort | null = null;
let webWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
let webWriteChain: Promise<void> = Promise.resolve();

export function isEnttecProConnectedWeb(): boolean {
  return webPort !== null && webWriter !== null;
}

export async function connectEnttecProWeb(): Promise<void> {
  if (!isWebSerialAvailable()) {
    throw new Error("Web Serial is not available in this browser");
  }
  const serial = navigator.serial;
  if (!serial) {
    throw new Error("Web Serial is not available in this browser");
  }

  await disconnectEnttecProWeb();

  const selectedPort = await serial.requestPort({ filters: ENTTEC_USB_FILTERS });
  await selectedPort.open({ baudRate: ENTTEC_PRO_BAUD_RATE });
  const writer = selectedPort.writable?.getWriter() ?? null;
  if (!writer) {
    webPort = selectedPort;
    await disconnectEnttecProWeb();
    throw new Error("Enttec Pro port has no writable stream");
  }
  webPort = selectedPort;
  webWriter = writer;
}

export async function disconnectEnttecProWeb(): Promise<void> {
  webWriteChain = Promise.resolve();
  if (webWriter) {
    try {
      webWriter.releaseLock();
    } catch {
      // ignore
    }
    webWriter = null;
  }
  if (webPort) {
    try {
      await webPort.close();
    } catch {
      // ignore
    }
    webPort = null;
  }
}

async function sendEnttecProWeb(universe: number, channels: number[]): Promise<void> {
  if (!webWriter) {
    throw new Error("Enttec Pro is not connected");
  }

  const packet = buildEnttecProPacket(universe, Uint8Array.from(channels));
  if (!packet) {
    throw new Error(`Enttec Pro only supports universes 1 and 2 (got ${universe})`);
  }

  webWriteChain = webWriteChain.then(async () => {
    await webWriter?.write(packet);
  });
  await webWriteChain;
}

export async function disconnectEnttecPro(): Promise<void> {
  if (isNativeApp()) {
    await disconnectEnttecProTauri();
    return;
  }
  await disconnectEnttecProWeb();
}

export async function sendEnttecProDmx(
  universe: number,
  channels: number[],
  summary?: string,
): Promise<void> {
  if (universe < ENTTEC_PRO_MIN_UNIVERSE || universe > ENTTEC_PRO_MAX_UNIVERSE) {
    throw new Error(`Enttec Pro only supports universes 1 and 2 (got ${universe})`);
  }

  const normalized = channels.map((value) => Math.min(255, Math.max(0, Math.round(value))));
  if (normalized.length === 0) {
    throw new Error("At least one DMX channel value is required");
  }

  if (isNativeApp()) {
    await sendEnttecProTauri(universe, normalized);
  } else {
    await sendEnttecProWeb(universe, normalized);
  }

  const payload: ArtNetDebugPayload = {
    universe,
    sequence: 0,
    physical: 0,
    channelCount: normalized.length,
    channels: normalized,
    transport: "enttec",
  };
  const logSummary = summary ?? `Enttec ${formatArtNetSummary(payload)}`;
  recordOutboundArtNetDebug(logSummary);
  pushDebugLog({
    direction: "out",
    kind: "artnet",
    summary: logSummary,
    payload,
  });
}
