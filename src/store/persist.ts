import type { PersistOptions } from "zustand/middleware";
import i18n from "../i18n";
import { type AppLanguage, DEFAULT_LANGUAGE, isAppLanguage } from "../i18n/languages";
import {
  defaultMediaPipeConfig,
  type MediaPipeConfig,
  type MediaPipeLandmarkMapping,
  normalizeMediaPipeLandmarkMapping,
} from "../lib/mediapipe/types";
import { clearPerformerHistory } from "../lib/performer-history";
import { normalizeSensorAxisMapping, type SensorAxisMapping } from "../lib/sensors/types";
import {
  type Control,
  type ControlLayout,
  type ControlProtocol,
  controlOutputsFromLegacyProtocol,
  createControlLayout,
  defaultControlIoAssignments,
  defaultLayoutSettings,
  defaultMqttMapping,
  defaultOutputConfig,
  defaultPerformerIoConfig,
  type LayoutSettings,
  normalizeOutputConfig,
  normalizePerformerIoConfig,
  type OutputConfig,
  type PerformerIoConfig,
} from "../types";
import type { AppStore } from "./appStoreTypes";

export const APP_STORE_PERSIST_NAME = "wd3000-layout";
export const APP_STORE_PERSIST_VERSION = 12;

type PersistedAppStore = Pick<
  AppStore,
  | "controls"
  | "output"
  | "performerIo"
  | "layoutSettings"
  | "sensorMappings"
  | "mediapipeConfig"
  | "mediapipeMappings"
  | "language"
>;

type LegacyPersistedState = {
  controls?: Array<
    Partial<Control> & {
      id?: string;
      type: Control["type"];
      protocol?: ControlProtocol;
      layout?: Partial<ControlLayout>;
      mqtt?: Partial<Control["mqtt"]>;
      osc?: Partial<Control["osc"]>;
      midi?: Partial<Control["midi"]>;
      mqttConnectionId?: string | null;
    }
  >;
  output?: OutputConfig & { protocol?: ControlProtocol };
  performerIo?: Partial<PerformerIoConfig>;
  layoutSettings?: LayoutSettings & { mode?: string };
  sensorMappings?: Record<string, SensorAxisMapping>;
  mediapipeConfig?: Partial<MediaPipeConfig>;
  mediapipeMappings?: Record<string, MediaPipeLandmarkMapping>;
  language?: AppLanguage;
};

function migratePersistedState(persistedState: unknown, version: number): PersistedAppStore {
  const state = persistedState as LegacyPersistedState;

  const legacyProtocol = state.output?.protocol ?? "osc";
  const rawOutput = state.output ?? defaultOutputConfig();
  const { protocol: _legacyProtocol, ...connectionSettings } = rawOutput as OutputConfig & {
    protocol?: ControlProtocol;
  };
  const output = normalizeOutputConfig(connectionSettings);

  let performerIo = normalizePerformerIoConfig(
    version >= 9 ? (state.performerIo as PerformerIoConfig | undefined) : state.performerIo,
    output,
  );

  if (version < 8) {
    performerIo = defaultPerformerIoConfig(output);
  }

  const controls = (state.controls ?? []).map((control, index) => {
    const protocol = control.protocol ?? legacyProtocol;
    const fromProtocol = controlOutputsFromLegacyProtocol(protocol);
    const hasExplicitEnabled =
      typeof control.osc?.enabled === "boolean" ||
      typeof control.midi?.enabled === "boolean" ||
      typeof control.mqtt?.enabled === "boolean";
    const ioAssignments =
      version >= 8
        ? {
            oscSenderId: control.oscSenderId ?? null,
            midiOutputId: control.midiOutputId ?? null,
            oscReceiverId: control.oscReceiverId ?? null,
            midiInputId: control.midiInputId ?? null,
            mqttConnectionId: control.mqttConnectionId ?? null,
          }
        : defaultControlIoAssignments(performerIo);
    const {
      protocol: _legacyControlProtocol,
      osc: storedOsc,
      midi: storedMidi,
      mqtt: storedMqtt,
      ...controlRest
    } = control;

    return {
      ...controlRest,
      ...ioAssignments,
      osc: {
        address: storedOsc?.address ?? `/control/${index + 1}`,
        ...storedOsc,
        enabled:
          typeof storedOsc?.enabled === "boolean"
            ? storedOsc.enabled
            : hasExplicitEnabled
              ? false
              : fromProtocol.oscEnabled,
      },
      midi: {
        channel: 1,
        note: 60,
        cc: index,
        ...storedMidi,
        enabled:
          typeof storedMidi?.enabled === "boolean"
            ? storedMidi.enabled
            : hasExplicitEnabled
              ? false
              : fromProtocol.midiEnabled,
      },
      mqtt: {
        ...defaultMqttMapping(control.type, index + 1),
        ...storedMqtt,
        enabled:
          typeof storedMqtt?.enabled === "boolean"
            ? storedMqtt.enabled
            : hasExplicitEnabled
              ? false
              : fromProtocol.mqttEnabled,
      },
      layout: {
        ...createControlLayout(index),
        ...control.layout,
        order: control.layout?.order ?? index,
      },
    };
  });

  if (version < 2) {
    return {
      ...state,
      output,
      performerIo,
      controls,
      layoutSettings: state.layoutSettings ?? defaultLayoutSettings(),
    } as PersistedAppStore;
  }

  if (version < 3) {
    return {
      ...state,
      output,
      performerIo,
      controls,
    } as PersistedAppStore;
  }

  if (version < 4) {
    return {
      ...state,
      output,
      performerIo,
      controls,
      sensorMappings: {},
    } as PersistedAppStore;
  }

  const sensorMappings = Object.fromEntries(
    Object.entries(state.sensorMappings ?? {}).map(([key, mapping]) => {
      const [sensorId, axis] = key.split(":");
      return [key, normalizeSensorAxisMapping(mapping, performerIo, sensorId, axis)];
    }),
  );

  const { active: _legacyMediaPipeActive, ...persistedMediaPipeConfig } = (state.mediapipeConfig ??
    {}) as Partial<MediaPipeConfig> & {
    active?: boolean;
  };
  const mediapipeConfig = {
    ...defaultMediaPipeConfig(),
    ...persistedMediaPipeConfig,
    selectedLandmarks: persistedMediaPipeConfig.selectedLandmarks ?? [],
  };

  const mediapipeMappings = Object.fromEntries(
    Object.entries(state.mediapipeMappings ?? {}).map(([key, mapping]) => [
      key,
      normalizeMediaPipeLandmarkMapping(mapping, performerIo, key),
    ]),
  );

  if (version < 7) {
    const rawLayoutSettings = state.layoutSettings;
    const layoutSettings: LayoutSettings = {
      gridSize:
        typeof rawLayoutSettings?.gridSize === "number"
          ? rawLayoutSettings.gridSize
          : defaultLayoutSettings().gridSize,
    };

    return {
      ...state,
      output,
      performerIo,
      controls,
      sensorMappings,
      mediapipeConfig,
      mediapipeMappings,
      layoutSettings,
    } as PersistedAppStore;
  }

  return {
    ...state,
    output,
    performerIo,
    controls,
    sensorMappings,
    mediapipeConfig,
    mediapipeMappings,
    language: isAppLanguage(state.language) ? state.language : DEFAULT_LANGUAGE,
    layoutSettings: {
      gridSize:
        typeof state.layoutSettings?.gridSize === "number"
          ? state.layoutSettings.gridSize
          : defaultLayoutSettings().gridSize,
    },
  } as PersistedAppStore;
}

export const appStorePersistOptions: PersistOptions<AppStore, PersistedAppStore> = {
  name: APP_STORE_PERSIST_NAME,
  version: APP_STORE_PERSIST_VERSION,
  migrate: migratePersistedState,
  merge: (persistedState, currentState) => {
    const persisted = persistedState as Partial<PersistedAppStore>;

    return {
      ...currentState,
      ...persisted,
      language: isAppLanguage(persisted.language) ? persisted.language : currentState.language,
      output: normalizeOutputConfig(persisted.output),
      performerIo: normalizePerformerIoConfig(persisted.performerIo, persisted.output),
      mode: "edit",
      activeView: "home",
      selectedControlId: null,
      inspectorControlId: null,
    };
  },
  partialize: (state) => ({
    controls: state.controls,
    output: state.output,
    performerIo: state.performerIo,
    layoutSettings: state.layoutSettings,
    sensorMappings: state.sensorMappings,
    mediapipeConfig: state.mediapipeConfig,
    mediapipeMappings: state.mediapipeMappings,
    language: state.language,
  }),
  onRehydrateStorage: () => (state) => {
    clearPerformerHistory();
    if (state && isAppLanguage(state.language)) {
      void i18n.changeLanguage(state.language);
    }
  },
};
