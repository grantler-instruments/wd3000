import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { getActiveMidiInputPort } from "../lib/input";
import {
  isEchoOfRecentOutboundArtNet,
  isEchoOfRecentOutboundMqtt,
  isEchoOfRecentOutboundOsc,
  pushDebugLog,
} from "../lib/debugLog";
import { isMidiDebugKind } from "../lib/midiTypes";
import type { OscArgPayload } from "../lib/oscMessages";
import { isNativeApp } from "../lib/platform";

let listenerRefCount = 0;
let registrationStarted = false;
let unregisterListeners: (() => void) | null = null;

async function registerListeners() {
  const [unlistenOsc, unlistenMidi, unlistenArtNet, unlistenMqtt] = await Promise.all([
    listen<{
      summary: string;
      address?: string;
      args?: OscArgPayload[];
    }>("osc-debug-message", (event) => {
      if (isEchoOfRecentOutboundOsc(event.payload.summary)) {
        return;
      }

      const payload =
        event.payload.address !== undefined
          ? {
              address: event.payload.address,
              args: event.payload.args ?? [],
            }
          : undefined;

      pushDebugLog({
        direction: "in",
        kind: "osc",
        summary: event.payload.summary,
        payload,
      });
    }),
    listen<{ kind: string; summary: string; bytes?: number[] }>(
      "midi-debug-message",
      (event) => {
        const { kind, summary, bytes } = event.payload;
        if (isMidiDebugKind(kind)) {
          pushDebugLog({
            direction: "in",
            kind,
            summary,
            payload: bytes ? { bytes } : undefined,
            portName: getActiveMidiInputPort(),
          });
        }
      },
    ),
    listen<{
      summary: string;
      universe: number;
      sequence: number;
      physical: number;
      channelCount: number;
      channels: number[];
    }>("artnet-debug-message", (event) => {
      if (isEchoOfRecentOutboundArtNet(event.payload.summary)) {
        return;
      }

      pushDebugLog({
        direction: "in",
        kind: "artnet",
        summary: event.payload.summary,
        payload: {
          universe: event.payload.universe,
          sequence: event.payload.sequence,
          physical: event.payload.physical,
          channelCount: event.payload.channelCount,
          channels: event.payload.channels,
        },
      });
    }),
    listen<{
      summary: string;
      topic: string;
      payload: number[];
      qos: number;
      retain: boolean;
    }>("mqtt-debug-message", (event) => {
      if (isEchoOfRecentOutboundMqtt(event.payload.summary)) {
        return;
      }

      pushDebugLog({
        direction: "in",
        kind: "mqtt",
        summary: event.payload.summary,
        payload: {
          topic: event.payload.topic,
          payload: event.payload.payload,
          qos: event.payload.qos,
          retain: event.payload.retain,
        },
      });
    }),
  ]);

  return () => {
    unlistenOsc();
    unlistenMidi();
    unlistenArtNet();
    unlistenMqtt();
  };
}

export function useDebuggerEvents() {
  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }

    listenerRefCount += 1;

    if (!registrationStarted) {
      registrationStarted = true;
      void registerListeners()
        .then((unregister) => {
          if (listenerRefCount > 0) {
            unregisterListeners = unregister;
          } else {
            unregister();
            registrationStarted = false;
          }
        })
        .catch((error) => {
          registrationStarted = false;
          console.error("Failed to register debugger listeners:", error);
        });
    }

    return () => {
      listenerRefCount -= 1;
      if (listenerRefCount === 0 && unregisterListeners) {
        unregisterListeners();
        unregisterListeners = null;
        registrationStarted = false;
      }
    };
  }, []);
}
