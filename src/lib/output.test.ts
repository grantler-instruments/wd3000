import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createControl,
  createMidiOutputEndpoint,
  createMqttConnection,
  createOscSender,
  defaultPerformerIoConfig,
} from "../types";

const invoke = vi.fn();
const publishMqttMessage = vi.fn();
const sendWebMidiRaw = vi.fn();
const pushDebugLog = vi.fn();
const recordOutboundMqttDebug = vi.fn();
const recordOutboundOscDebug = vi.fn();
const isNativeApp = vi.fn(() => true);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("./mqtt", async () => {
  const actual = await vi.importActual<typeof import("./mqtt")>("./mqtt");
  return {
    ...actual,
    publishMqttMessage: (...args: unknown[]) => publishMqttMessage(...args),
  };
});

vi.mock("./webMidi", () => ({
  listWebMidiOutputs: vi.fn(async () => []),
  sendWebMidiRaw: (...args: unknown[]) => sendWebMidiRaw(...args),
}));

vi.mock("./platform", () => ({
  isNativeApp: () => isNativeApp(),
  isTextInputTarget: () => false,
  isWebMidiSupported: () => false,
}));

vi.mock("./debugLog", () => ({
  pushDebugLog: (...args: unknown[]) => pushDebugLog(...args),
  recordOutboundMqttDebug: (...args: unknown[]) => recordOutboundMqttDebug(...args),
  recordOutboundOscDebug: (...args: unknown[]) => recordOutboundOscDebug(...args),
}));

import { sendButtonValue, sendMqttMessage, sendOscMessage, sendSliderValue } from "./output";

describe("sendOscMessage / sendMqttMessage validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeApp.mockReturnValue(true);
    invoke.mockResolvedValue(undefined);
    publishMqttMessage.mockResolvedValue(undefined);
  });

  it("rejects OSC addresses that do not start with /", async () => {
    await expect(
      sendOscMessage("127.0.0.1", 9000, "slider", [{ type: "float", value: 1 }]),
    ).rejects.toThrow("OSC address must start with /");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("sends trimmed OSC via invoke and logs outbound traffic", async () => {
    await sendOscMessage("127.0.0.1", 9000, " /fader ", [{ type: "float", value: 0.5 }]);
    expect(invoke).toHaveBeenCalledWith("send_osc", {
      host: "127.0.0.1",
      port: 9000,
      address: "/fader",
      args: [{ type: "float", value: 0.5 }],
    });
    expect(recordOutboundOscDebug).toHaveBeenCalled();
    expect(pushDebugLog).toHaveBeenCalledWith(
      expect.objectContaining({ direction: "out", kind: "osc" }),
    );
  });

  it("rejects empty MQTT topic or host", async () => {
    await expect(sendMqttMessage("localhost", 1883, "tcp", "  ", "1", 0, false)).rejects.toThrow(
      "MQTT topic cannot be empty",
    );
    await expect(sendMqttMessage("  ", 1883, "tcp", "topic", "1", 0, false)).rejects.toThrow(
      "MQTT broker host cannot be empty",
    );
    expect(publishMqttMessage).not.toHaveBeenCalled();
  });

  it("publishes MQTT and logs when enabled", async () => {
    await sendMqttMessage("localhost", 1883, "tcp", "slider/1", "0.5", 0, false);
    expect(publishMqttMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "localhost",
        port: 1883,
        topic: "slider/1",
        payload: "0.5",
      }),
    );
    expect(recordOutboundMqttDebug).toHaveBeenCalled();
  });
});

describe("sendSliderValue / sendButtonValue routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativeApp.mockReturnValue(true);
    invoke.mockResolvedValue(undefined);
    publishMqttMessage.mockResolvedValue(undefined);
  });

  it("sends OSC + MIDI for an assigned slider and aggregates errors", async () => {
    const oscSender = createOscSender({ name: "OSC 1", host: "10.0.0.1", port: 9000 });
    const midiOutput = createMidiOutputEndpoint({ name: "MIDI 1", portName: "Bus 1" });
    const performerIo = {
      ...defaultPerformerIoConfig(),
      oscSenders: [oscSender],
      midiOutputs: [midiOutput],
      mqttConnections: [],
    };

    const control = {
      ...createControl("slider", 1, 0, performerIo),
      osc: { enabled: true, address: "/slider/1" },
      midi: { enabled: true, channel: 1, note: 60, cc: 11 },
      mqtt: { enabled: false, topic: "slider/1", qos: 0 as const, retain: false },
      oscSenderId: oscSender.id,
      midiOutputId: midiOutput.id,
      mqttConnectionId: null,
    };

    await sendSliderValue(control, performerIo, 0.5);

    expect(invoke).toHaveBeenCalledWith(
      "send_osc",
      expect.objectContaining({
        host: "10.0.0.1",
        port: 9000,
        address: "/slider/1",
        args: [{ type: "float", value: 0.5 }],
      }),
    );
    expect(invoke).toHaveBeenCalledWith(
      "send_midi_raw",
      expect.objectContaining({
        portName: "Bus 1",
        bytes: [0xb0, 11, 64],
      }),
    );
  });

  it("throws when MIDI output is assigned without a port name", async () => {
    const midiOutput = createMidiOutputEndpoint({ name: "MIDI 1", portName: "" });
    const performerIo = {
      ...defaultPerformerIoConfig(),
      midiOutputs: [midiOutput],
      oscSenders: [],
      mqttConnections: [],
    };
    const control = {
      ...createControl("button", 1, 0, performerIo),
      osc: { enabled: false, address: "/button/1" },
      midi: { enabled: true, channel: 1, note: 60, cc: 1 },
      mqtt: { enabled: false, topic: "button/1", qos: 0 as const, retain: false },
      midiOutputId: midiOutput.id,
      oscSenderId: null,
      mqttConnectionId: null,
    };

    await expect(sendButtonValue(control, performerIo, true)).rejects.toThrow(
      "No MIDI output assigned",
    );
  });

  it("publishes MQTT when a broker is assigned", async () => {
    const mqtt = createMqttConnection({
      name: "Broker",
      host: "localhost",
      port: 1883,
      protocol: "tcp",
    });
    const performerIo = {
      ...defaultPerformerIoConfig(),
      mqttConnections: [mqtt],
      oscSenders: [],
      midiOutputs: [],
    };
    const control = {
      ...createControl("button", 1, 0, performerIo),
      osc: { enabled: false, address: "/button/1" },
      midi: { enabled: false, channel: 1, note: 60, cc: 1 },
      mqtt: { enabled: true, topic: "button/1", qos: 0 as const, retain: false },
      mqttConnectionId: mqtt.id,
      oscSenderId: null,
      midiOutputId: null,
    };

    await sendButtonValue(control, performerIo, true);

    expect(publishMqttMessage).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "button/1", payload: "1" }),
    );
  });
});
