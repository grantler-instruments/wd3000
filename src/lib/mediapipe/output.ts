import throttle from "lodash.throttle";
import type { PerformerIoConfig } from "../../types";
import { findMidiOutputEndpoint, findMqttConnection, findOscSender } from "../../types";
import type { OscArgPayload } from "../oscMessages";
import { sendMidiCc, sendMqttMessage, sendOscMessage } from "../output";
import { scaleSensorValueToMidi } from "../sensors/output";
import type { MediaPipeLandmark, MediaPipeLandmarkMapping } from "./types";
import { defaultMediaPipeLandmarkMapping, normalizeMediaPipeLandmarkMapping } from "./types";

export function buildOscLandmarkArgs(landmark: MediaPipeLandmark): OscArgPayload[] {
  const args: OscArgPayload[] = [
    { type: "float", value: landmark.x },
    { type: "float", value: landmark.y },
    { type: "float", value: landmark.z },
  ];

  if (typeof landmark.visibility === "number") {
    args.push({ type: "float", value: landmark.visibility });
  }

  return args;
}

export async function sendMediaPipeLandmarkOutput(
  performerIo: PerformerIoConfig,
  mapping: MediaPipeLandmarkMapping,
  landmark: MediaPipeLandmark,
) {
  const errors: string[] = [];

  if (mapping.osc.enabled) {
    const sender = findOscSender(performerIo, mapping.osc.senderId);
    if (!sender) {
      errors.push("No OSC sender assigned");
    } else {
      try {
        await sendOscMessage(
          sender.host,
          sender.port,
          mapping.osc.address,
          buildOscLandmarkArgs(landmark),
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (mapping.mqtt.enabled) {
    const connection = findMqttConnection(performerIo, mapping.mqtt.connectionId);
    if (!connection) {
      errors.push("No MQTT broker assigned");
    } else {
      try {
        await sendMqttMessage(
          connection.host,
          connection.port,
          connection.protocol,
          mapping.mqtt.topic,
          JSON.stringify(landmark),
          mapping.mqtt.qos,
          mapping.mqtt.retain,
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (mapping.midi.enabled) {
    const midiOutput = findMidiOutputEndpoint(performerIo, mapping.midi.outputId);
    if (!midiOutput?.portName) {
      errors.push("No MIDI output assigned");
    } else {
      const components = [
        { cc: mapping.midi.xCc, value: landmark.x },
        { cc: mapping.midi.yCc, value: landmark.y },
        { cc: mapping.midi.zCc, value: landmark.z },
      ];

      for (const component of components) {
        try {
          await sendMidiCc(
            midiOutput.portName,
            mapping.midi.channel,
            component.cc,
            scaleSensorValueToMidi(component.value, mapping.midi.min, mapping.midi.max),
          );
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
}

const throttledSenders = new Map<string, ReturnType<typeof throttle>>();

export function sendMediaPipeLandmarkOutputThrottled(
  performerIo: PerformerIoConfig,
  mappings: Record<string, MediaPipeLandmarkMapping>,
  key: string,
  landmark: MediaPipeLandmark,
) {
  let sender = throttledSenders.get(key);
  if (!sender) {
    sender = throttle(
      async (
        io: PerformerIoConfig,
        storedMappings: Record<string, MediaPipeLandmarkMapping>,
        mappingKey: string,
        value: MediaPipeLandmark,
      ) => {
        const stored = storedMappings[mappingKey];
        const mapping = stored
          ? normalizeMediaPipeLandmarkMapping(stored, io, mappingKey)
          : defaultMediaPipeLandmarkMapping(mappingKey, io);

        await sendMediaPipeLandmarkOutput(io, mapping, value).catch(() => {
          // Ignore transient send failures while tracking is streaming.
        });
      },
      16,
      { leading: true, trailing: true },
    );
    throttledSenders.set(key, sender);
  }

  sender(performerIo, mappings, key, landmark);
}

export function resetMediaPipeOutputThrottles() {
  for (const sender of throttledSenders.values()) {
    sender.cancel();
  }
  throttledSenders.clear();
}
