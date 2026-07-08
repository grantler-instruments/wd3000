import { sendMidiCc, sendOscMessage } from "../output";
import type { OutputConfig } from "../../types";
import type { SensorAxisMapping, SensorReading } from "./types";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
} from "./types";

function scaleToMidi(value: number, min: number, max: number) {
  if (max === min) {
    return 0;
  }

  const normalized = (value - min) / (max - min);
  return Math.round(Math.min(127, Math.max(0, normalized * 127)));
}

export async function sendSensorAxisOutput(
  output: OutputConfig,
  mapping: SensorAxisMapping,
  value: number,
) {
  const errors: string[] = [];

  if (mapping.osc.enabled) {
    try {
      await sendOscMessage(
        mapping.osc.host,
        mapping.osc.port,
        mapping.osc.address,
        [{ type: "float", value }],
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (mapping.midi.enabled) {
    const portName = mapping.midi.portName ?? output.midiPortName;
    if (!portName) {
      errors.push("No MIDI output port selected");
    } else {
      try {
        await sendMidiCc(
          portName,
          mapping.midi.channel,
          mapping.midi.cc,
          scaleToMidi(value, mapping.midi.min, mapping.midi.max),
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

export async function sendSensorReadingOutput(
  output: OutputConfig,
  mappings: Record<string, SensorAxisMapping>,
  reading: SensorReading,
) {
  const sends = Object.entries(reading.values).map(([axis, value]) => {
    const key = sensorAxisKey(reading.sensorId, axis);
    const stored = mappings[key];
    const mapping = stored
      ? normalizeSensorAxisMapping(stored, output, reading.sensorId, axis)
      : defaultSensorAxisMapping(reading.sensorId, axis, output);

    return sendSensorAxisOutput(output, mapping, value).catch(() => {
      // Ignore transient send failures while sensors are streaming.
    });
  });

  await Promise.all(sends);
}
