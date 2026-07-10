import type { Control, PerformerIoConfig } from "../types";
import { findMidiInputEndpoint, findOscReceiver } from "../types";
import type { SensorAxisMapping } from "./sensors/types";

export function collectPerformerListenPorts(
  performerIo: PerformerIoConfig,
  controls: Control[],
): number[] {
  const ports = new Set<number>();

  for (const receiver of performerIo.oscReceivers) {
    if (receiver.port > 0) {
      ports.add(receiver.port);
    }
  }

  for (const control of controls) {
    const receiver = findOscReceiver(performerIo, control.oscReceiverId);
    if (receiver && receiver.port > 0) {
      ports.add(receiver.port);
    }
  }

  return [...ports].sort((left, right) => left - right);
}

export function collectPerformerMidiInputPorts(
  performerIo: PerformerIoConfig,
  controls: Control[],
): string[] {
  const ports = new Set<string>();

  for (const input of performerIo.midiInputs) {
    if (input.portName.trim()) {
      ports.add(input.portName.trim());
    }
  }

  for (const control of controls) {
    const input = findMidiInputEndpoint(performerIo, control.midiInputId);
    if (input?.portName.trim()) {
      ports.add(input.portName.trim());
    }
  }

  return [...ports];
}

export function clearRemovedEndpointReferences(
  controls: Control[],
  removedIds: Set<string>,
): Control[] {
  if (removedIds.size === 0) {
    return controls;
  }

  return controls.map((control) => ({
    ...control,
    oscSenderId:
      control.oscSenderId && removedIds.has(control.oscSenderId)
        ? null
        : control.oscSenderId,
    midiOutputId:
      control.midiOutputId && removedIds.has(control.midiOutputId)
        ? null
        : control.midiOutputId,
    oscReceiverId:
      control.oscReceiverId && removedIds.has(control.oscReceiverId)
        ? null
        : control.oscReceiverId,
    midiInputId:
      control.midiInputId && removedIds.has(control.midiInputId)
        ? null
        : control.midiInputId,
  }));
}

export function clearRemovedSensorEndpointReferences(
  sensorMappings: Record<string, SensorAxisMapping>,
  removedIds: Set<string>,
): Record<string, SensorAxisMapping> {
  if (removedIds.size === 0) {
    return sensorMappings;
  }

  const next: Record<string, SensorAxisMapping> = {};

  for (const [key, mapping] of Object.entries(sensorMappings)) {
    next[key] = {
      ...mapping,
      osc: {
        ...mapping.osc,
        senderId:
          mapping.osc.senderId && removedIds.has(mapping.osc.senderId)
            ? null
            : mapping.osc.senderId,
      },
      midi: {
        ...mapping.midi,
        outputId:
          mapping.midi.outputId && removedIds.has(mapping.midi.outputId)
            ? null
            : mapping.midi.outputId,
      },
    };
  }

  return next;
}
