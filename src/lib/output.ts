import { invoke } from "@tauri-apps/api/core";
import type { DebugLogKind } from "./debugLog";
import {
  pushDebugLog,
  recordOutboundMqttDebug,
  recordOutboundOscDebug,
} from "./debugLog";
import {
  asMidiPayload,
  midiCcBytes,
  midiChannelPressureBytes,
  midiNoteOffBytes,
  midiNoteOnBytes,
  midiPitchBendBytes,
  midiPolyPressureBytes,
  midiProgramChangeBytes,
} from "./midiPayload";
import type { OscArgPayload } from "./oscMessages";
import { formatOscMonitorSummary } from "./oscMessages";
import { isNativeApp } from "./platform";
import {
  encodeMqttPayload,
  formatMqttSummary,
  publishMqttMessage,
  type MqttQoS,
  type MqttTransportProtocol,
} from "./mqtt";
import { listWebMidiOutputs, sendWebMidiRaw } from "./webMidi";
import type { Control, PerformerIoConfig } from "../types";
import {
  controlUsesMidiOutput,
  controlUsesMqttOutput,
  controlUsesOscOutput,
  findMidiOutputEndpoint,
  findMqttConnection,
  findOscSender,
} from "../types";

export async function listMidiOutputs(): Promise<string[]> {
  if (isNativeApp()) {
    return invoke<string[]>("list_midi_outputs");
  }

  return listWebMidiOutputs();
}

export async function sendMqttMessage(
  host: string,
  port: number,
  protocol: MqttTransportProtocol,
  topic: string,
  payload: string,
  qos: MqttQoS,
  retain: boolean,
  summary?: string,
  options?: { logToDebug?: boolean },
) {
  const trimmedTopic = topic.trim();
  if (!trimmedTopic) {
    throw new Error("MQTT topic cannot be empty");
  }

  const trimmedHost = host.trim();
  if (!trimmedHost) {
    throw new Error("MQTT broker host cannot be empty");
  }

  await publishMqttMessage({
    host: trimmedHost,
    port,
    protocol,
    topic: trimmedTopic,
    payload,
    qos,
    retain,
  });

  const logSummary =
    summary ?? formatMqttSummary(trimmedTopic, payload, qos, retain);

  if (options?.logToDebug !== false) {
    recordOutboundMqttDebug(logSummary);
    pushDebugLog({
      direction: "out",
      kind: "mqtt",
      summary: logSummary,
      payload: {
        topic: trimmedTopic,
        payload: encodeMqttPayload(payload),
        qos,
        retain,
      },
    });
  }
}

async function sendMidiBytesToPort(
  portName: string,
  bytes: number[],
  kind: DebugLogKind,
  summary: string,
  options?: { logToDebug?: boolean },
) {
  if (!portName) {
    throw new Error("No MIDI output port selected");
  }

  if (isNativeApp()) {
    await invoke("send_midi_raw", {
      portName,
      bytes,
    });
  } else {
    await sendWebMidiRaw(portName, bytes);
  }

  if (options?.logToDebug !== false) {
    pushDebugLog({
      direction: "out",
      kind,
      summary,
      payload: asMidiPayload(bytes),
      portName,
    });
  }
}

async function sendOscToSender(sender: { host: string; port: number }, address: string, value: number) {
  await sendOscMessage(sender.host, sender.port, address, [
    { type: "float", value },
  ]);
}

export async function sendOscMessage(
  host: string,
  port: number,
  address: string,
  args: OscArgPayload[],
  summary?: string,
  options?: { logToDebug?: boolean },
) {
  const trimmedAddress = address.trim();
  if (!trimmedAddress.startsWith("/")) {
    throw new Error("OSC address must start with /");
  }

  await invoke("send_osc", {
    host,
    port,
    address: trimmedAddress,
    args,
  });
  const logSummary =
    summary ?? formatOscMonitorSummary(trimmedAddress, args);

  if (options?.logToDebug !== false) {
    recordOutboundOscDebug(logSummary);
    pushDebugLog({
      direction: "out",
      kind: "osc",
      summary: logSummary,
      payload: {
        address: trimmedAddress,
        args,
      },
    });
  }
}

export async function sendMidiNote(
  portName: string,
  channel: number,
  note: number,
  velocity: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiNoteOnBytes(channel, note, velocity),
    "midi-note",
    `Ch${channel} Note ${note} vel ${velocity}`,
  );
}

export async function sendMidiCc(
  portName: string,
  channel: number,
  cc: number,
  value: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiCcBytes(channel, cc, value),
    "midi-cc",
    `Ch${channel} CC${cc} → ${value}`,
  );
}

export async function sendMidiNoteOff(
  portName: string,
  channel: number,
  note: number,
  velocity: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiNoteOffBytes(channel, note, velocity),
    "midi-note",
    `Ch${channel} Note Off ${note} vel ${velocity}`,
  );
}

export async function sendMidiProgramChange(
  portName: string,
  channel: number,
  program: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiProgramChangeBytes(channel, program),
    "midi-pc",
    `Ch${channel} Program ${program}`,
  );
}

export async function sendMidiPitchBend(
  portName: string,
  channel: number,
  value: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiPitchBendBytes(channel, value),
    "midi-pitch-bend",
    `Ch${channel} Pitch Bend ${value}`,
  );
}

export async function sendMidiChannelPressure(
  portName: string,
  channel: number,
  pressure: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiChannelPressureBytes(channel, pressure),
    "midi-pressure",
    `Ch${channel} Pressure ${pressure}`,
  );
}

export async function sendMidiPolyPressure(
  portName: string,
  channel: number,
  note: number,
  pressure: number,
) {
  await sendMidiBytesToPort(
    portName,
    midiPolyPressureBytes(channel, note, pressure),
    "midi-poly-pressure",
    `Ch${channel} Note ${note} pressure ${pressure}`,
  );
}

export async function sendMidiRaw(
  portName: string,
  bytes: number[],
  kind: DebugLogKind,
  summary: string,
  options?: { logToDebug?: boolean },
) {
  await sendMidiBytesToPort(portName, bytes, kind, summary, options);
}

function resolveControlEndpoints(control: Control, performerIo: PerformerIoConfig) {
  const oscSender = findOscSender(performerIo, control.oscSenderId);
  const midiOutput = findMidiOutputEndpoint(performerIo, control.midiOutputId);
  const mqttConnection = findMqttConnection(performerIo, control.mqttConnectionId);
  return { oscSender, midiOutput, mqttConnection };
}

async function sendMqttForControl(
  connection: { host: string; port: number; protocol: MqttTransportProtocol },
  topic: string,
  payload: string,
  qos: MqttQoS,
  retain: boolean,
) {
  await sendMqttMessage(
    connection.host,
    connection.port,
    connection.protocol,
    topic,
    payload,
    qos,
    retain,
  );
}

async function sendMqttValue(
  control: Control,
  performerIo: PerformerIoConfig,
  topic: string,
  payload: string,
  errors: string[],
) {
  if (!controlUsesMqttOutput(control)) {
    return;
  }

  const { mqttConnection } = resolveControlEndpoints(control, performerIo);
  if (!mqttConnection) {
    errors.push("No MQTT broker assigned");
    return;
  }

  try {
    await sendMqttForControl(
      mqttConnection,
      topic,
      payload,
      control.mqtt.qos,
      control.mqtt.retain,
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

export async function sendSliderValue(
  control: Control,
  performerIo: PerformerIoConfig,
  value: number,
) {
  const normalized = Math.min(1, Math.max(0, value));
  const { oscSender, midiOutput } = resolveControlEndpoints(control, performerIo);
  const errors: string[] = [];

  await sendMqttValue(
    control,
    performerIo,
    control.mqtt.topic,
    String(normalized),
    errors,
  );

  if (controlUsesOscOutput(control)) {
    if (!oscSender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscToSender(oscSender, control.osc.address, normalized);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (controlUsesMidiOutput(control)) {
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      try {
        await sendMidiCc(
          midiOutput.portName,
          control.midi.channel,
          control.midi.cc,
          Math.round(normalized * 127),
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export async function sendPadValue(
  control: Control,
  performerIo: PerformerIoConfig,
  x: number,
  y: number,
) {
  const normalizedX = Math.min(1, Math.max(0, x));
  const normalizedY = Math.min(1, Math.max(0, y));
  const ccY = control.midi.ccY ?? control.midi.cc + 1;
  const { oscSender, midiOutput } = resolveControlEndpoints(control, performerIo);
  const errors: string[] = [];

  if (controlUsesMqttOutput(control)) {
    await sendMqttValue(
      control,
      performerIo,
      `${control.mqtt.topic}/x`,
      String(normalizedX),
      errors,
    );
    await sendMqttValue(
      control,
      performerIo,
      `${control.mqtt.topic}/y`,
      String(normalizedY),
      errors,
    );
  }

  if (controlUsesOscOutput(control)) {
    if (!oscSender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscToSender(oscSender, `${control.osc.address}/x`, normalizedX);
        await sendOscToSender(oscSender, `${control.osc.address}/y`, normalizedY);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (controlUsesMidiOutput(control)) {
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      try {
        await sendMidiCc(
          midiOutput.portName,
          control.midi.channel,
          control.midi.cc,
          Math.round(normalizedX * 127),
        );
        await sendMidiCc(
          midiOutput.portName,
          control.midi.channel,
          ccY,
          Math.round(normalizedY * 127),
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export async function sendKeyboardNote(
  control: Control,
  performerIo: PerformerIoConfig,
  note: number,
  pressed: boolean,
) {
  const velocity = control.midi.velocity ?? 100;
  const { oscSender, midiOutput } = resolveControlEndpoints(control, performerIo);
  const errors: string[] = [];

  await sendMqttValue(
    control,
    performerIo,
    `${control.mqtt.topic}/${note}`,
    pressed ? "1" : "0",
    errors,
  );

  if (controlUsesOscOutput(control)) {
    if (!oscSender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscToSender(
          oscSender,
          `${control.osc.address}/${note}`,
          pressed ? 1 : 0,
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (controlUsesMidiOutput(control)) {
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      try {
        if (pressed) {
          await sendMidiNote(midiOutput.portName, control.midi.channel, note, velocity);
        } else {
          await sendMidiNoteOff(midiOutput.portName, control.midi.channel, note, 0);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export async function sendTabsValue(
  control: Control,
  performerIo: PerformerIoConfig,
  tabIndex: number,
) {
  const index = Math.min(127, Math.max(0, Math.round(tabIndex)));
  const { oscSender, midiOutput } = resolveControlEndpoints(control, performerIo);
  const errors: string[] = [];

  await sendMqttValue(control, performerIo, control.mqtt.topic, String(index), errors);

  if (controlUsesOscOutput(control)) {
    if (!oscSender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscToSender(oscSender, control.osc.address, index);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (controlUsesMidiOutput(control)) {
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      try {
        await sendMidiCc(midiOutput.portName, control.midi.channel, control.midi.cc, index);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

export async function sendButtonValue(
  control: Control,
  performerIo: PerformerIoConfig,
  pressed: boolean,
) {
  const value = pressed ? 1 : 0;
  const velocity = pressed ? 127 : 0;
  const { oscSender, midiOutput } = resolveControlEndpoints(control, performerIo);
  const errors: string[] = [];

  await sendMqttValue(control, performerIo, control.mqtt.topic, String(value), errors);

  if (controlUsesOscOutput(control)) {
    if (!oscSender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscToSender(oscSender, control.osc.address, value);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (controlUsesMidiOutput(control)) {
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      try {
        await sendMidiNote(
          midiOutput.portName,
          control.midi.channel,
          control.midi.note,
          velocity,
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}
