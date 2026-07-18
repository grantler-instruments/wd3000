import type { StateCreator } from "zustand";
import i18n from "../../i18n";
import {
  clearRemovedEndpointReferences,
  clearRemovedMediaPipeEndpointReferences,
  clearRemovedSensorEndpointReferences,
} from "../../lib/performerIo";
import {
  MidiInputEndpoint,
  MidiOutputEndpoint,
  MqttConnection,
  OscReceiver,
  OscSender,
  OutputConfig,
  PerformerIoConfig,
  createMidiInputEndpoint,
  createMidiOutputEndpoint,
  createMqttConnection,
  createOscReceiver,
  createOscSender,
  defaultOutputConfig,
  defaultPerformerIoConfig,
} from "../../types";
import type { AppStore } from "../appStoreTypes";

export interface IoSlice {
  output: OutputConfig;
  performerIo: PerformerIoConfig;
  midiPorts: string[];
  midiInputPorts: string[];
  setOutput: (patch: Partial<OutputConfig>) => void;
  addOscSender: (patch?: Partial<OscSender> & { name?: string }) => void;
  updateOscSender: (id: string, patch: Partial<Omit<OscSender, "id">>) => void;
  removeOscSender: (id: string) => void;
  addOscReceiver: (patch?: Partial<OscReceiver> & { name?: string }) => void;
  updateOscReceiver: (id: string, patch: Partial<Omit<OscReceiver, "id">>) => void;
  removeOscReceiver: (id: string) => void;
  addMidiOutput: (patch?: Partial<MidiOutputEndpoint> & { name?: string }) => void;
  updateMidiOutput: (id: string, patch: Partial<Omit<MidiOutputEndpoint, "id">>) => void;
  removeMidiOutput: (id: string) => void;
  addMidiInput: (patch?: Partial<MidiInputEndpoint> & { name?: string }) => void;
  updateMidiInput: (id: string, patch: Partial<Omit<MidiInputEndpoint, "id">>) => void;
  removeMidiInput: (id: string) => void;
  addMqttConnection: (patch?: Partial<MqttConnection> & { name?: string }) => void;
  updateMqttConnection: (id: string, patch: Partial<Omit<MqttConnection, "id">>) => void;
  removeMqttConnection: (id: string) => void;
  setMidiPorts: (ports: string[]) => void;
  setMidiInputPorts: (ports: string[]) => void;
}

export const createIoSlice: StateCreator<AppStore, [], [], IoSlice> = (set) => ({
  output: defaultOutputConfig(),
  performerIo: defaultPerformerIoConfig(),
  midiPorts: [],
  midiInputPorts: [],
  setOutput: (patch) =>
    set((state) => ({
      output: { ...state.output, ...patch },
    })),
  addOscSender: (patch) =>
    set((state) => {
      const sender = createOscSender({
        name:
          patch?.name ??
          i18n.t("io.defaultOscSender", {
            n: state.performerIo.oscSenders.length + 1,
          }),
        ...patch,
      });

      return {
        performerIo: {
          ...state.performerIo,
          oscSenders: [...state.performerIo.oscSenders, sender],
        },
      };
    }),
  updateOscSender: (id, patch) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        oscSenders: state.performerIo.oscSenders.map((sender) =>
          sender.id === id ? { ...sender, ...patch } : sender,
        ),
      },
    })),
  removeOscSender: (id) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        oscSenders: state.performerIo.oscSenders.filter((sender) => sender.id !== id),
      },
      controls: clearRemovedEndpointReferences(state.controls, new Set([id])),
      sensorMappings: clearRemovedSensorEndpointReferences(
        state.sensorMappings,
        new Set([id]),
      ),
      mediapipeMappings: clearRemovedMediaPipeEndpointReferences(
        state.mediapipeMappings,
        new Set([id]),
      ),
    })),
  addOscReceiver: (patch) =>
    set((state) => {
      const receiver = createOscReceiver({
        name:
          patch?.name ??
          i18n.t("io.defaultOscReceiver", {
            n: state.performerIo.oscReceivers.length + 1,
          }),
        ...patch,
      });

      return {
        performerIo: {
          ...state.performerIo,
          oscReceivers: [...state.performerIo.oscReceivers, receiver],
        },
      };
    }),
  updateOscReceiver: (id, patch) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        oscReceivers: state.performerIo.oscReceivers.map((receiver) =>
          receiver.id === id ? { ...receiver, ...patch } : receiver,
        ),
      },
    })),
  removeOscReceiver: (id) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        oscReceivers: state.performerIo.oscReceivers.filter(
          (receiver) => receiver.id !== id,
        ),
      },
      controls: clearRemovedEndpointReferences(state.controls, new Set([id])),
    })),
  addMidiOutput: (patch) =>
    set((state) => {
      const endpoint = createMidiOutputEndpoint({
        name:
          patch?.name ??
          i18n.t("io.defaultMidiOutput", {
            n: state.performerIo.midiOutputs.length + 1,
          }),
        portName: patch?.portName ?? state.midiPorts[0] ?? "",
        ...patch,
      });

      return {
        performerIo: {
          ...state.performerIo,
          midiOutputs: [...state.performerIo.midiOutputs, endpoint],
        },
      };
    }),
  updateMidiOutput: (id, patch) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        midiOutputs: state.performerIo.midiOutputs.map((endpoint) =>
          endpoint.id === id ? { ...endpoint, ...patch } : endpoint,
        ),
      },
    })),
  removeMidiOutput: (id) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        midiOutputs: state.performerIo.midiOutputs.filter((endpoint) => endpoint.id !== id),
      },
      controls: clearRemovedEndpointReferences(state.controls, new Set([id])),
      sensorMappings: clearRemovedSensorEndpointReferences(
        state.sensorMappings,
        new Set([id]),
      ),
      mediapipeMappings: clearRemovedMediaPipeEndpointReferences(
        state.mediapipeMappings,
        new Set([id]),
      ),
    })),
  addMidiInput: (patch) =>
    set((state) => {
      const endpoint = createMidiInputEndpoint({
        name:
          patch?.name ??
          i18n.t("io.defaultMidiInput", {
            n: state.performerIo.midiInputs.length + 1,
          }),
        portName: patch?.portName ?? state.midiInputPorts[0] ?? "",
        ...patch,
      });

      return {
        performerIo: {
          ...state.performerIo,
          midiInputs: [...state.performerIo.midiInputs, endpoint],
        },
      };
    }),
  updateMidiInput: (id, patch) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        midiInputs: state.performerIo.midiInputs.map((endpoint) =>
          endpoint.id === id ? { ...endpoint, ...patch } : endpoint,
        ),
      },
    })),
  removeMidiInput: (id) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        midiInputs: state.performerIo.midiInputs.filter((endpoint) => endpoint.id !== id),
      },
      controls: clearRemovedEndpointReferences(state.controls, new Set([id])),
    })),
  addMqttConnection: (patch) =>
    set((state) => {
      const output = state.output;
      const connection = createMqttConnection({
        name:
          patch?.name ??
          i18n.t("io.defaultMqtt", {
            n: state.performerIo.mqttConnections.length + 1,
          }),
        host: patch?.host ?? output.mqttComposerHost,
        port: patch?.port ?? output.mqttComposerPort,
        protocol: patch?.protocol ?? output.mqttComposerProtocol,
        ...patch,
      });

      return {
        performerIo: {
          ...state.performerIo,
          mqttConnections: [...state.performerIo.mqttConnections, connection],
        },
      };
    }),
  updateMqttConnection: (id, patch) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        mqttConnections: state.performerIo.mqttConnections.map((connection) =>
          connection.id === id ? { ...connection, ...patch } : connection,
        ),
      },
    })),
  removeMqttConnection: (id) =>
    set((state) => ({
      performerIo: {
        ...state.performerIo,
        mqttConnections: state.performerIo.mqttConnections.filter(
          (connection) => connection.id !== id,
        ),
      },
      controls: clearRemovedEndpointReferences(state.controls, new Set([id])),
      mediapipeMappings: clearRemovedMediaPipeEndpointReferences(
        state.mediapipeMappings,
        new Set([id]),
      ),
    })),
  setMidiPorts: (ports) => set({ midiPorts: ports }),
  setMidiInputPorts: (ports) => set({ midiInputPorts: ports }),
});
