import { invoke } from "@tauri-apps/api/core";

export const MQTT_DEFAULT_TCP_PORT = 1883;
export const MQTT_DEFAULT_WS_PORT = 9001;
/** @deprecated Use MQTT_DEFAULT_TCP_PORT */
export const MQTT_DEFAULT_PORT = MQTT_DEFAULT_TCP_PORT;

export type MqttQoS = 0 | 1 | 2;
export type MqttTransportProtocol = "tcp" | "ws";

export const MQTT_DEFAULT_COMPOSER_HOST = "localhost";

export interface MqttBrokerStatus {
  enabled: boolean;
  running: boolean;
  tcpPort: number | null;
  wsPort: number | null;
  /** @deprecated Use tcpPort */
  port: number | null;
  listening: boolean;
  subscribeTopics: string[];
}

export interface MqttListenerOptions {
  host: string;
  port: number;
  protocol: MqttTransportProtocol;
  topics: string[];
}

export function formatMqttSummary(
  topic: string,
  payload: string,
  qos: MqttQoS,
  retain: boolean,
): string {
  const parts = [topic, `qos=${qos}`];
  if (retain) {
    parts.push("retain");
  }
  parts.push(payload.length === 0 ? "<empty>" : `"${payload}"`);
  return parts.join(" ");
}

export function encodeMqttPayload(payload: string): number[] {
  return [...new TextEncoder().encode(payload)];
}

export function decodeMqttPayload(bytes: number[]): string {
  if (bytes.length === 0) {
    return "";
  }

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(
    new Uint8Array(bytes),
  );
  if ([...decoded].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  })) {
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
  }

  return decoded;
}

export async function startMqttBroker(tcpPort: number, wsPort: number): Promise<void> {
  await invoke("start_mqtt_broker", { tcpPort, wsPort });
}

export async function stopMqttBroker(): Promise<void> {
  await invoke("stop_mqtt_broker");
}

export async function startMqttListener(options: MqttListenerOptions): Promise<void> {
  const topics = options.topics
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0);

  await invoke("start_mqtt_listener", {
    host: options.host,
    port: options.port,
    protocol: options.protocol,
    subscribeTopics: topics,
  });
}

export async function stopMqttListener(): Promise<void> {
  await invoke("stop_mqtt_listener");
}

export async function getMqttBrokerStatus(): Promise<MqttBrokerStatus> {
  return invoke<MqttBrokerStatus>("get_mqtt_broker_status");
}

export async function publishMqttMessage(options: {
  host: string;
  port: number;
  protocol: MqttTransportProtocol;
  topic: string;
  payload: string;
  qos: MqttQoS;
  retain: boolean;
}): Promise<void> {
  await invoke("mqtt_publish", {
    host: options.host,
    port: options.port,
    protocol: options.protocol,
    topic: options.topic,
    payload: encodeMqttPayload(options.payload),
    qos: options.qos,
    retain: options.retain,
  });
}
