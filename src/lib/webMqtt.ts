import mqtt, { type IPublishPacket, type MqttClient } from "mqtt";
import { isEchoOfRecentOutboundMqtt, pushDebugLog } from "./debugLog";
import {
  decodeMqttPayload,
  formatMqttSummary,
  type MqttListenerOptions,
  type MqttQoS,
  type MqttTransportProtocol,
} from "./mqtt";
import { resetMqttMonitorStatus, setMqttMonitorStatus } from "./mqttMonitorStatus";

const TCP_BROWSER_ERROR =
  "TCP MQTT requires the desktop or mobile app. Use WebSocket (WS) in the browser.";

let monitorClient: MqttClient | null = null;
let monitorKey: string | null = null;

export function formatWsBrokerUrl(host: string, port: number): string {
  const trimmed = host.trim();
  if (!trimmed) {
    throw new Error("MQTT broker host cannot be empty");
  }

  if (trimmed.includes("://")) {
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  if (trimmed.includes(":") && !trimmed.startsWith("[")) {
    return `ws://[${trimmed}]:${port}/`;
  }

  return `ws://${trimmed}:${port}/`;
}

function assertWsProtocol(protocol: MqttTransportProtocol) {
  if (protocol !== "ws") {
    throw new Error(TCP_BROWSER_ERROR);
  }
}

function waitForConnect(client: MqttClient, timeoutMs = 10_000): Promise<void> {
  if (client.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("MQTT connection timed out"));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      client.off("connect", onConnect);
      client.off("error", onError);
    };

    client.on("connect", onConnect);
    client.on("error", onError);
  });
}

function listenerKey(host: string, port: number, topics: string[]) {
  return `${host.trim().toLowerCase()}|${port}|${topics.join("\0")}`;
}

function handleMonitorMessage(topic: string, payload: Uint8Array, packet: IPublishPacket) {
  const bytes = Array.from(payload);
  const text = decodeMqttPayload(bytes);
  const qos = (packet.qos ?? 0) as MqttQoS;
  const retain = Boolean(packet.retain);
  const summary = formatMqttSummary(topic, text, qos, retain);

  if (isEchoOfRecentOutboundMqtt(summary)) {
    return;
  }

  pushDebugLog({
    direction: "in",
    kind: "mqtt",
    summary,
    payload: {
      topic,
      payload: bytes,
      qos,
      retain,
    },
  });
}

export async function publishWebMqttMessage(options: {
  host: string;
  port: number;
  protocol: MqttTransportProtocol;
  topic: string;
  payload: string;
  qos: MqttQoS;
  retain: boolean;
}): Promise<void> {
  assertWsProtocol(options.protocol);

  const url = formatWsBrokerUrl(options.host, options.port);
  const client = mqtt.connect(url, {
    clientId: `wd3000-pub-${crypto.randomUUID().slice(0, 8)}`,
    reconnectPeriod: 0,
    connectTimeout: 10_000,
    clean: true,
    protocolVersion: 4,
  });

  try {
    await waitForConnect(client);
    await new Promise<void>((resolve, reject) => {
      client.publish(
        options.topic,
        options.payload,
        { qos: options.qos, retain: options.retain },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  } finally {
    client.end(true);
  }
}

export async function startWebMqttListener(options: MqttListenerOptions): Promise<void> {
  assertWsProtocol(options.protocol);

  const topics = options.topics.map((topic) => topic.trim()).filter((topic) => topic.length > 0);
  if (topics.length === 0) {
    await stopWebMqttListener();
    return;
  }

  const key = listenerKey(options.host, options.port, topics);
  if (monitorClient && monitorKey === key) {
    if (monitorClient.connected) {
      setMqttMonitorStatus("connected", null);
    } else {
      setMqttMonitorStatus("connecting", null);
    }
    return;
  }

  await stopWebMqttListener();

  const url = formatWsBrokerUrl(options.host, options.port);
  setMqttMonitorStatus("connecting", null);

  const client = mqtt.connect(url, {
    clientId: `wd3000-mon-${crypto.randomUUID().slice(0, 8)}`,
    reconnectPeriod: 2_000,
    connectTimeout: 10_000,
    clean: true,
    protocolVersion: 4,
  });

  monitorClient = client;
  monitorKey = key;

  client.on("connect", () => {
    if (monitorClient !== client) {
      return;
    }

    setMqttMonitorStatus("connected", null);
    client.subscribe(topics, (error) => {
      if (monitorClient !== client) {
        return;
      }
      if (error) {
        setMqttMonitorStatus("disconnected", error.message);
      }
    });
  });

  client.on("reconnect", () => {
    if (monitorClient !== client) {
      return;
    }
    setMqttMonitorStatus("connecting", null);
  });

  client.on("close", () => {
    if (monitorClient !== client) {
      return;
    }
    setMqttMonitorStatus("disconnected", null);
  });

  client.on("offline", () => {
    if (monitorClient !== client) {
      return;
    }
    setMqttMonitorStatus("disconnected", null);
  });

  client.on("error", (error) => {
    if (monitorClient !== client) {
      return;
    }
    setMqttMonitorStatus("disconnected", error.message);
  });

  client.on("message", (topic, payload, packet) => {
    if (monitorClient !== client) {
      return;
    }
    handleMonitorMessage(topic, payload, packet);
  });
}

export async function stopWebMqttListener(): Promise<void> {
  const client = monitorClient;
  monitorClient = null;
  monitorKey = null;

  if (client) {
    client.removeAllListeners();
    await new Promise<void>((resolve) => {
      client.end(true, {}, () => resolve());
    });
  }

  resetMqttMonitorStatus();
}
