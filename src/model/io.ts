import i18n from "../i18n";
import type { Control } from "./control";

export interface OutputConfig {
  oscHost: string;
  oscPort: number;
  oscListenPort: number;
  mqttBrokerPort: number;
  mqttBrokerWsPort: number;
  mqttBrokerEnabled: boolean;
  mqttSubscribeTopics: string[];
  mqttMonitorHost: string;
  mqttMonitorPort: number;
  mqttMonitorProtocol: "tcp" | "ws";
  mqttComposerHost: string;
  mqttComposerPort: number;
  mqttComposerProtocol: "tcp" | "ws";
  midiPortName: string | null;
  midiInputPortName: string | null;
}

export interface OscSender {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface OscReceiver {
  id: string;
  name: string;
  port: number;
}

export interface MidiOutputEndpoint {
  id: string;
  name: string;
  portName: string;
}

export interface MidiInputEndpoint {
  id: string;
  name: string;
  portName: string;
}

export interface MqttConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "tcp" | "ws";
}

export interface PerformerIoConfig {
  oscSenders: OscSender[];
  oscReceivers: OscReceiver[];
  midiOutputs: MidiOutputEndpoint[];
  midiInputs: MidiInputEndpoint[];
  mqttConnections: MqttConnection[];
}

export const defaultOutputConfig = (): OutputConfig => ({
  oscHost: "127.0.0.1",
  oscPort: 9000,
  oscListenPort: 9001,
  mqttBrokerPort: 1883,
  mqttBrokerWsPort: 9001,
  mqttBrokerEnabled: false,
  mqttSubscribeTopics: [],
  mqttMonitorHost: "localhost",
  mqttMonitorPort: 1883,
  mqttMonitorProtocol: "tcp",
  mqttComposerHost: "localhost",
  mqttComposerPort: 1883,
  mqttComposerProtocol: "tcp",
  midiPortName: null,
  midiInputPortName: null,
});

export function normalizeOutputConfig(
  value?: Partial<OutputConfig> & { mqttSubscribeFilter?: string },
): OutputConfig {
  const defaults = defaultOutputConfig();
  if (!value) {
    return defaults;
  }

  const subscribeTopics = Array.isArray(value.mqttSubscribeTopics)
    ? value.mqttSubscribeTopics.filter((topic): topic is string => typeof topic === "string")
    : typeof value.mqttSubscribeFilter === "string" && value.mqttSubscribeFilter.trim()
      ? [value.mqttSubscribeFilter]
      : defaults.mqttSubscribeTopics;

  return {
    ...defaults,
    ...value,
    mqttSubscribeTopics: subscribeTopics,
    mqttMonitorHost:
      typeof value.mqttMonitorHost === "string"
        ? value.mqttMonitorHost
        : typeof value.mqttComposerHost === "string"
          ? value.mqttComposerHost
          : defaults.mqttMonitorHost,
    mqttMonitorPort:
      typeof value.mqttMonitorPort === "number"
        ? value.mqttMonitorPort
        : typeof value.mqttComposerPort === "number"
          ? value.mqttComposerPort
          : defaults.mqttMonitorPort,
    mqttMonitorProtocol:
      value.mqttMonitorProtocol === "tcp" || value.mqttMonitorProtocol === "ws"
        ? value.mqttMonitorProtocol
        : value.mqttComposerProtocol === "tcp" || value.mqttComposerProtocol === "ws"
          ? value.mqttComposerProtocol
          : defaults.mqttMonitorProtocol,
  };
}

export function createMqttConnection(
  patch: Partial<MqttConnection> & Pick<MqttConnection, "name">,
): MqttConnection {
  return {
    id: crypto.randomUUID(),
    host: "localhost",
    port: 1883,
    protocol: "tcp",
    ...patch,
  };
}

export function createOscSender(patch: Partial<OscSender> & Pick<OscSender, "name">): OscSender {
  return {
    id: crypto.randomUUID(),
    host: "127.0.0.1",
    port: 9000,
    ...patch,
  };
}

export function createOscReceiver(
  patch: Partial<OscReceiver> & Pick<OscReceiver, "name">,
): OscReceiver {
  return {
    id: crypto.randomUUID(),
    port: 9001,
    ...patch,
  };
}

export function createMidiOutputEndpoint(
  patch: Partial<MidiOutputEndpoint> & Pick<MidiOutputEndpoint, "name">,
): MidiOutputEndpoint {
  return {
    id: crypto.randomUUID(),
    portName: "",
    ...patch,
  };
}

export function createMidiInputEndpoint(
  patch: Partial<MidiInputEndpoint> & Pick<MidiInputEndpoint, "name">,
): MidiInputEndpoint {
  return {
    id: crypto.randomUUID(),
    portName: "",
    ...patch,
  };
}

export function defaultPerformerIoConfig(output?: OutputConfig): PerformerIoConfig {
  const connection = output ?? defaultOutputConfig();
  const oscSender = createOscSender({
    name: i18n.t("io.defaultOscSender", { n: 1 }),
    host: connection.oscHost,
    port: connection.oscPort,
  });
  const oscReceiver = createOscReceiver({
    name: i18n.t("io.defaultOscReceiver", { n: 1 }),
    port: connection.oscListenPort,
  });

  const mqttConnection = createMqttConnection({
    name: i18n.t("io.defaultMqtt", { n: 1 }),
    host: connection.mqttComposerHost,
    port: connection.mqttComposerPort,
    protocol: connection.mqttComposerProtocol,
  });

  return {
    oscSenders: [oscSender],
    oscReceivers: connection.oscListenPort > 0 ? [oscReceiver] : [],
    midiOutputs: connection.midiPortName
      ? [
          createMidiOutputEndpoint({
            name: i18n.t("io.defaultMidiOutput", { n: 1 }),
            portName: connection.midiPortName,
          }),
        ]
      : [],
    midiInputs: connection.midiInputPortName
      ? [
          createMidiInputEndpoint({
            name: i18n.t("io.defaultMidiInput", { n: 1 }),
            portName: connection.midiInputPortName,
          }),
        ]
      : [],
    mqttConnections: [mqttConnection],
  };
}

export function normalizePerformerIoConfig(
  value?: Partial<PerformerIoConfig>,
  output?: OutputConfig,
): PerformerIoConfig {
  const defaults = defaultPerformerIoConfig(output);
  if (!value) {
    return defaults;
  }

  return {
    oscSenders: Array.isArray(value.oscSenders) ? value.oscSenders : defaults.oscSenders,
    oscReceivers: Array.isArray(value.oscReceivers) ? value.oscReceivers : defaults.oscReceivers,
    midiOutputs: Array.isArray(value.midiOutputs) ? value.midiOutputs : defaults.midiOutputs,
    midiInputs: Array.isArray(value.midiInputs) ? value.midiInputs : defaults.midiInputs,
    mqttConnections: Array.isArray(value.mqttConnections)
      ? value.mqttConnections
      : defaults.mqttConnections,
  };
}

export function defaultControlIoAssignments(
  performerIo: PerformerIoConfig,
): Pick<
  Control,
  "oscSenderId" | "midiOutputId" | "oscReceiverId" | "midiInputId" | "mqttConnectionId"
> {
  return {
    oscSenderId: performerIo.oscSenders[0]?.id ?? null,
    midiOutputId: performerIo.midiOutputs[0]?.id ?? null,
    mqttConnectionId: performerIo.mqttConnections[0]?.id ?? null,
    oscReceiverId: performerIo.oscReceivers[0]?.id ?? null,
    midiInputId: performerIo.midiInputs[0]?.id ?? null,
  };
}

export function findMqttConnection(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MqttConnection | null {
  if (!id) {
    return null;
  }

  return performerIo.mqttConnections.find((connection) => connection.id === id) ?? null;
}

export function findOscSender(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): OscSender | null {
  if (!id) {
    return null;
  }

  return performerIo.oscSenders.find((sender) => sender.id === id) ?? null;
}

export function findOscReceiver(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): OscReceiver | null {
  if (!id) {
    return null;
  }

  return performerIo.oscReceivers.find((receiver) => receiver.id === id) ?? null;
}

export function findMidiOutputEndpoint(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MidiOutputEndpoint | null {
  if (!id) {
    return null;
  }

  return performerIo.midiOutputs.find((endpoint) => endpoint.id === id) ?? null;
}

export function findMidiInputEndpoint(
  performerIo: PerformerIoConfig,
  id: string | null | undefined,
): MidiInputEndpoint | null {
  if (!id) {
    return null;
  }

  return performerIo.midiInputs.find((endpoint) => endpoint.id === id) ?? null;
}

export function controlUsesMqttOutput(control: Control): boolean {
  return control.mqtt.enabled && !!control.mqttConnectionId;
}

export function controlUsesOscOutput(control: Control): boolean {
  return control.osc.enabled && !!control.oscSenderId;
}

export function controlUsesMidiOutput(control: Control): boolean {
  return control.midi.enabled && !!control.midiOutputId;
}

export function endpointLabel(name: string, detail: string): string {
  return detail ? `${name} (${detail})` : name;
}
