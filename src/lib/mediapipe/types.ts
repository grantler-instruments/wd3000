import type { MqttQoS } from "../mqtt";
import type { PerformerIoConfig } from "../../types";

export type MediaPipeTracker = "pose" | "hands";

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Flip x so coordinates match the mirrored selfie preview. */
export function mirrorLandmarkX(landmark: MediaPipeLandmark): MediaPipeLandmark {
  return {
    ...landmark,
    x: 1 - landmark.x,
  };
}

export interface MediaPipeOscMapping {
  enabled: boolean;
  address: string;
  senderId: string | null;
}

export interface MediaPipeMidiMapping {
  enabled: boolean;
  outputId: string | null;
  channel: number;
  xCc: number;
  yCc: number;
  zCc: number;
  min: number;
  max: number;
}

export interface MediaPipeMqttMapping {
  enabled: boolean;
  connectionId: string | null;
  topic: string;
  qos: MqttQoS;
  retain: boolean;
}

export interface MediaPipeLandmarkMapping {
  osc: MediaPipeOscMapping;
  midi: MediaPipeMidiMapping;
  mqtt: MediaPipeMqttMapping;
}

export interface MediaPipeConfig {
  tracker: MediaPipeTracker;
  videoDeviceId: string | null;
  active: boolean;
  selectedLandmarks: string[];
}

export function defaultMediaPipeConfig(): MediaPipeConfig {
  return {
    tracker: "hands",
    videoDeviceId: null,
    active: false,
    selectedLandmarks: [],
  };
}

export function poseLandmarkKey(landmark: string) {
  return `pose:${landmark}`;
}

export function handsLandmarkKey(handIndex: number, landmark: string) {
  return `hands:${handIndex}:${landmark}`;
}

export function defaultPoseOscAddress(landmark: string) {
  return `/mediapipe/pose/${landmark}`;
}

export function defaultHandsOscAddress(handIndex: number, landmark: string) {
  return `/mediapipe/hands/${handIndex}/${landmark}`;
}

export function defaultPoseMqttTopic(landmark: string) {
  return `mediapipe/pose/${landmark}`;
}

export function defaultHandsMqttTopic(handIndex: number, landmark: string) {
  return `mediapipe/hands/${handIndex}/${landmark}`;
}

export function defaultMediaPipeLandmarkMapping(
  key: string,
  performerIo: Pick<PerformerIoConfig, "oscSenders" | "midiOutputs" | "mqttConnections">,
): MediaPipeLandmarkMapping {
  const parts = key.split(":");
  const oscAddress =
    parts[0] === "pose"
      ? defaultPoseOscAddress(parts[1] ?? "landmark")
      : defaultHandsOscAddress(Number(parts[1] ?? 0), parts[2] ?? "landmark");
  const mqttTopic =
    parts[0] === "pose"
      ? defaultPoseMqttTopic(parts[1] ?? "landmark")
      : defaultHandsMqttTopic(Number(parts[1] ?? 0), parts[2] ?? "landmark");

  return {
    osc: {
      enabled: true,
      address: oscAddress,
      senderId: performerIo.oscSenders[0]?.id ?? null,
    },
    midi: {
      enabled: false,
      outputId: performerIo.midiOutputs[0]?.id ?? null,
      channel: 1,
      xCc: 0,
      yCc: 1,
      zCc: 2,
      min: 0,
      max: 1,
    },
    mqtt: {
      enabled: false,
      connectionId: performerIo.mqttConnections[0]?.id ?? null,
      topic: mqttTopic,
      qos: 0,
      retain: false,
    },
  };
}

export function normalizeMediaPipeLandmarkMapping(
  mapping: {
    osc?: Partial<MediaPipeOscMapping>;
    midi?: Partial<MediaPipeMidiMapping>;
    mqtt?: Partial<MediaPipeMqttMapping>;
  },
  performerIo: Pick<PerformerIoConfig, "oscSenders" | "midiOutputs" | "mqttConnections">,
  key: string,
): MediaPipeLandmarkMapping {
  const defaults = defaultMediaPipeLandmarkMapping(key, performerIo);

  return {
    osc: {
      enabled: mapping.osc?.enabled ?? defaults.osc.enabled,
      address: mapping.osc?.address ?? defaults.osc.address,
      senderId: mapping.osc?.senderId ?? defaults.osc.senderId,
    },
    midi: {
      enabled: mapping.midi?.enabled ?? defaults.midi.enabled,
      outputId: mapping.midi?.outputId ?? defaults.midi.outputId,
      channel: mapping.midi?.channel ?? defaults.midi.channel,
      xCc: mapping.midi?.xCc ?? defaults.midi.xCc,
      yCc: mapping.midi?.yCc ?? defaults.midi.yCc,
      zCc: mapping.midi?.zCc ?? defaults.midi.zCc,
      min: mapping.midi?.min ?? defaults.midi.min,
      max: mapping.midi?.max ?? defaults.midi.max,
    },
    mqtt: {
      enabled: mapping.mqtt?.enabled ?? defaults.mqtt.enabled,
      connectionId: mapping.mqtt?.connectionId ?? defaults.mqtt.connectionId,
      topic: mapping.mqtt?.topic ?? defaults.mqtt.topic,
      qos: mapping.mqtt?.qos ?? defaults.mqtt.qos,
      retain: mapping.mqtt?.retain ?? defaults.mqtt.retain,
    },
  };
}

export function mediaPipeLandmarkKeysForSelection(
  tracker: MediaPipeTracker,
  landmark: string,
): string[] {
  if (tracker === "pose") {
    return [poseLandmarkKey(landmark)];
  }

  return [handsLandmarkKey(0, landmark), handsLandmarkKey(1, landmark)];
}

export function formatMediaPipeLandmarkKey(key: string): string {
  const parts = key.split(":");
  if (parts[0] === "pose") {
    return parts[1] ?? key;
  }

  if (parts[0] === "hands") {
    return `hand ${parts[1]} / ${parts[2] ?? ""}`;
  }

  return key;
}
