import { type ArtNetDebugPayload, buildArtNetChannels } from "./artnet";
import { pushDebugLog, recordOutboundArtNetDebug } from "./debugLog";
import {
  buildDeemexMidiMessages,
  clampDeemexMidiStartChannel,
  deemexMaxDmxChannels,
  formatDeemexComposerSummary,
} from "./deemex-midi";
import { sendMidiRaw } from "./output";
import { isNativeApp, isWebMidiSupported } from "./platform";

export function canUseDeemex(): boolean {
  return isNativeApp() || isWebMidiSupported();
}

export async function sendDeemexDmx(options: {
  portName: string;
  startChannel: number;
  channel: number;
  value: number;
  summary?: string;
}): Promise<void> {
  const portName = options.portName.trim();
  if (!portName) {
    throw new Error("No MIDI output port selected");
  }

  const startChannel = clampDeemexMidiStartChannel(options.startChannel);
  const maxChannels = deemexMaxDmxChannels(startChannel);
  const channel = Math.min(maxChannels, Math.max(1, Math.round(options.channel)));
  const value = Math.min(255, Math.max(0, Math.round(options.value)));

  const messages = buildDeemexMidiMessages(channel, value, startChannel);
  if (messages.length === 0) {
    throw new Error(
      `DMX channel ${channel} is out of range for Deemex start channel ${startChannel}`,
    );
  }

  for (const message of messages) {
    await sendMidiRaw(portName, message, "midi-cc", "", { logToDebug: false });
  }

  const channels = buildArtNetChannels(channel, value);
  const payload: ArtNetDebugPayload = {
    universe: 1,
    sequence: 0,
    physical: 0,
    channelCount: channels.length,
    channels,
    transport: "deemex",
  };
  const logSummary =
    options.summary ?? formatDeemexComposerSummary({ channel, value, startChannel });
  recordOutboundArtNetDebug(logSummary);
  pushDebugLog({
    direction: "out",
    kind: "artnet",
    summary: logSummary,
    payload,
    portName,
  });
}
