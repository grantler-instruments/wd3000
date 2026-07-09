import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PersistedAppConfig } from "../lib/config";
import {
  defaultSensorAxisMapping,
  normalizeSensorAxisMapping,
  sensorAxisKey,
  type SensorAxisMapping,
  type SensorMidiMapping,
} from "../lib/sensors/types";
import { clearRemovedEndpointReferences } from "../lib/performerIo";
import {
  cloneControlSubtree,
  collectControlSubtree,
  type ControlClipboard,
} from "../lib/controlClipboard";
import {
  AppMode,
  Control,
  ControlLayout,
  ControlPadValue,
  ControlType,
  DashboardView,
  DebuggerSubView,
  LayoutSettings,
  PerformerSubView,
  OutputConfig,
  PerformerIoConfig,
  MidiInputEndpoint,
  MidiOutputEndpoint,
  OscReceiver,
  OscSender,
  TabDropPreview,
  controlTabs,
  createControl,
  createControlLayout,
  createTabChildLayout,
  createMidiInputEndpoint,
  createMidiOutputEndpoint,
  createOscReceiver,
  createOscSender,
  defaultControlIoAssignments,
  defaultLayoutSettings,
  defaultOutputConfig,
  defaultPerformerIoConfig,
  isTopLevelControl,
  pruneOrphanTabChildren,
  tabChildControls,
  topLevelControls,
} from "../types";

interface AppState {
  mode: AppMode;
  activeView: DashboardView;
  performerSubView: PerformerSubView;
  debuggerSubView: DebuggerSubView;
  controls: Control[];
  output: OutputConfig;
  performerIo: PerformerIoConfig;
  layoutSettings: LayoutSettings;
  selectedControlId: string | null;
  inspectorControlId: string | null;
  midiPorts: string[];
  midiInputPorts: string[];
  controlValues: Record<string, number>;
  controlActiveNotes: Record<string, number[]>;
  controlPadValues: Record<string, ControlPadValue>;
  controlTabIndex: Record<string, number>;
  draggingControlId: string | null;
  dragHoverTabsId: string | null;
  tabDropPreview: TabDropPreview | null;
  controlClipboard: ControlClipboard | null;
  sensorMappings: Record<string, SensorAxisMapping>;
  lastError: string | null;
  setMode: (mode: AppMode) => void;
  setActiveView: (
    view: DashboardView,
    subView?: PerformerSubView | DebuggerSubView,
  ) => void;
  addControl: (type: ControlType, position?: { x: number; y: number }) => void;
  copyControl: (id: string) => void;
  cutControl: (id: string) => void;
  duplicateControl: (id: string) => void;
  pasteControl: (position?: { x: number; y: number }) => void;
  removeControl: (id: string) => void;
  selectControl: (id: string | null) => void;
  openControlInspector: (id: string) => void;
  closeControlInspector: () => void;
  updateControl: (id: string, patch: Partial<Control>) => void;
  updateControlLayout: (id: string, patch: Partial<ControlLayout>) => void;
  reorderTabChildren: (sourceId: string, targetId: string) => void;
  assignControlToTab: (
    controlId: string,
    parentId: string | null,
    tabId: string | null,
    position?: { x: number; y: number },
  ) => void;
  removeTabChildren: (tabsControlId: string, tabId: string) => void;
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
  setMidiPorts: (ports: string[]) => void;
  setMidiInputPorts: (ports: string[]) => void;
  setControlValue: (id: string, value: number) => void;
  setControlNoteActive: (id: string, note: number, active: boolean) => void;
  setControlPadValue: (id: string, x: number, y: number) => void;
  setControlTabIndex: (id: string, index: number) => void;
  setDraggingControlId: (id: string | null) => void;
  setDragHoverTabsId: (id: string | null) => void;
  setTabDropPreview: (preview: TabDropPreview | null) => void;
  getSensorAxisMapping: (sensorId: string, axis: string) => SensorAxisMapping;
  updateSensorAxisMapping: (
    sensorId: string,
    axis: string,
    patch: {
      osc?: Partial<SensorAxisMapping["osc"]>;
      midi?: Partial<SensorMidiMapping>;
    },
  ) => void;
  setLastError: (message: string | null) => void;
  importConfig: (config: PersistedAppConfig) => void;
}

function reindexTopLevelOrders(controls: Control[]): Control[] {
  const ordered = topLevelControls(controls);
  const orderById = new Map(ordered.map((control, index) => [control.id, index]));

  return controls.map((control) =>
    isTopLevelControl(control)
      ? {
          ...control,
          layout: { ...control.layout, order: orderById.get(control.id) ?? control.layout.order },
        }
      : control,
  );
}

function reindexTabChildOrders(
  controls: Control[],
  parentId: string,
  tabId: string,
): Control[] {
  const ordered = tabChildControls(controls, parentId, tabId);
  const orderById = new Map(ordered.map((control, index) => [control.id, index]));

  return controls.map((control) =>
    control.parentId === parentId && control.tabId === tabId
      ? {
          ...control,
          layout: { ...control.layout, order: orderById.get(control.id) ?? control.layout.order },
        }
      : control,
  );
}

function reindexOrders(controls: Control[]): Control[] {
  const topLevel = reindexTopLevelOrders(controls);
  const tabsControls = topLevel.filter((control) => control.type === "tabs");

  return tabsControls.reduce((next, tabsControl) => {
    return controlTabs(tabsControl).reduce(
      (acc, tab) => reindexTabChildOrders(acc, tabsControl.id, tab.id),
      next,
    );
  }, topLevel);
}

function collectDescendantIds(controls: Control[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const control of controls) {
      if (control.parentId && ids.has(control.parentId) && !ids.has(control.id)) {
        ids.add(control.id);
        grew = true;
      }
    }
  }

  return ids;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mode: "edit",
      activeView: "performer",
      performerSubView: "ui",
      debuggerSubView: "midi",
      controls: [],
      output: defaultOutputConfig(),
      performerIo: defaultPerformerIoConfig(),
      layoutSettings: defaultLayoutSettings(),
      selectedControlId: null,
      inspectorControlId: null,
      midiPorts: [],
      midiInputPorts: [],
      controlValues: {},
      controlActiveNotes: {},
      controlPadValues: {},
      controlTabIndex: {},
      draggingControlId: null,
      dragHoverTabsId: null,
      tabDropPreview: null,
      controlClipboard: null,
      sensorMappings: {},
      lastError: null,
      setMode: (mode) => set({ mode }),
      setActiveView: (view, subView) =>
        set((state) => {
          if (view === "performer") {
            return {
              activeView: view,
              performerSubView: (subView as PerformerSubView | undefined) ?? state.performerSubView,
            };
          }

          return {
            activeView: view,
            debuggerSubView: (subView as DebuggerSubView | undefined) ?? state.debuggerSubView,
          };
        }),
      addControl: (type, position) => {
        const controls = get().controls;
        const performerIo = get().performerIo;
        const index = controls.filter((control) => control.type === type).length + 1;
        const control = createControl(type, index, topLevelControls(controls).length, performerIo);
        if (position) {
          control.layout = { ...control.layout, x: position.x, y: position.y };
        }
        set({
          controls: reindexOrders([...controls, control]),
          selectedControlId: control.id,
          inspectorControlId: control.id,
        });
      },
      copyControl: (id) => {
        const controls = get().controls;
        const subtree = collectControlSubtree(controls, id);
        set({
          controlClipboard: {
            rootId: id,
            controls: structuredClone(subtree),
            mode: "copy",
          },
        });
      },
      cutControl: (id) => {
        const state = get();
        const subtree = collectControlSubtree(state.controls, id);
        const idsToRemove = collectDescendantIds(state.controls, id);
        const remaining = state.controls.filter((control) => !idsToRemove.has(control.id));

        set({
          controlClipboard: {
            rootId: id,
            controls: structuredClone(subtree),
            mode: "cut",
          },
          controls: reindexOrders(remaining),
          selectedControlId: idsToRemove.has(state.selectedControlId ?? "")
            ? null
            : state.selectedControlId,
          inspectorControlId: idsToRemove.has(state.inspectorControlId ?? "")
            ? null
            : state.inspectorControlId,
        });
      },
      duplicateControl: (id) => {
        const state = get();
        const gridSize = state.layoutSettings.gridSize;
        const { controls: cloned, rootId: newRootId } = cloneControlSubtree(state.controls, id, {
          positionOffset: { x: gridSize, y: gridSize },
        });

        set({
          controls: reindexOrders([...state.controls, ...cloned]),
          selectedControlId: newRootId,
        });
      },
      pasteControl: (position) => {
        const state = get();
        const clipboard = state.controlClipboard;
        if (!clipboard) {
          return;
        }

        const { controls: cloned, rootId: newRootId } = cloneControlSubtree(
          clipboard.controls,
          clipboard.rootId,
          {
            position,
            positionOffset: position
              ? undefined
              : { x: state.layoutSettings.gridSize, y: state.layoutSettings.gridSize },
            toTopLevel: position !== undefined,
          },
        );

        set({
          controls: reindexOrders([...state.controls, ...cloned]),
          selectedControlId: newRootId,
          controlClipboard: clipboard.mode === "cut" ? null : clipboard,
        });
      },
      removeControl: (id) =>
        set((state) => {
          const idsToRemove = collectDescendantIds(state.controls, id);
          const remaining = state.controls.filter((control) => !idsToRemove.has(control.id));

          return {
            controls: reindexOrders(remaining),
            selectedControlId: idsToRemove.has(state.selectedControlId ?? "")
              ? null
              : state.selectedControlId,
            inspectorControlId: idsToRemove.has(state.inspectorControlId ?? "")
              ? null
              : state.inspectorControlId,
          };
        }),
      selectControl: (id) =>
        set((state) => ({
          selectedControlId: id,
          inspectorControlId:
            id === null || id !== state.inspectorControlId ? null : state.inspectorControlId,
        })),
      openControlInspector: (id) =>
        set({ selectedControlId: id, inspectorControlId: id }),
      closeControlInspector: () => set({ inspectorControlId: null }),
      updateControl: (id, patch) =>
        set((state) => {
          let controls = state.controls.map((control) =>
            control.id === id ? { ...control, ...patch } : control,
          );

          if (patch.tabs) {
            const tabsControl = controls.find((control) => control.id === id);
            if (tabsControl?.type === "tabs") {
              const validTabIds = new Set(controlTabs(tabsControl).map((tab) => tab.id));
              controls = pruneOrphanTabChildren(controls, id, validTabIds);
              controls = reindexOrders(controls);
            }
          }

          return { controls };
        }),
      updateControlLayout: (id, patch) =>
        set((state) => ({
          controls: state.controls.map((control) =>
            control.id === id
              ? { ...control, layout: { ...control.layout, ...patch } }
              : control,
          ),
        })),
      reorderTabChildren: (sourceId, targetId) => {
        const controls = get().controls;
        const source = controls.find((control) => control.id === sourceId);
        const target = controls.find((control) => control.id === targetId);

        if (
          !source?.parentId ||
          !source.tabId ||
          !target?.parentId ||
          !target.tabId ||
          source.parentId !== target.parentId ||
          source.tabId !== target.tabId ||
          sourceId === targetId
        ) {
          return;
        }

        const sorted = tabChildControls(controls, source.parentId, source.tabId);
        const sourceIndex = sorted.findIndex((control) => control.id === sourceId);
        const targetIndex = sorted.findIndex((control) => control.id === targetId);

        if (sourceIndex < 0 || targetIndex < 0) {
          return;
        }

        const next = [...sorted];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);

        const orderById = new Map(next.map((control, index) => [control.id, index]));
        set({
          controls: controls.map((control) =>
            control.parentId === source.parentId && control.tabId === source.tabId
              ? {
                  ...control,
                  layout: {
                    ...control.layout,
                    order: orderById.get(control.id) ?? control.layout.order,
                  },
                }
              : control,
          ),
        });
      },
      assignControlToTab: (controlId, parentId, tabId, position) => {
        set((state) => {
          const control = state.controls.find((entry) => entry.id === controlId);
          if (!control) {
            return state;
          }

          if (parentId) {
            if (controlId === parentId || control.type === "tabs") {
              return state;
            }

            const parent = state.controls.find((entry) => entry.id === parentId);
            if (!parent || parent.type !== "tabs" || !tabId) {
              return state;
            }

            if (!controlTabs(parent).some((tab) => tab.id === tabId)) {
              return state;
            }
          }

          const oldParentId = control.parentId;
          const oldTabId = control.tabId;
          const withoutControl = state.controls.filter((entry) => entry.id !== controlId);

          let nextControl: Control;
          if (!parentId || !tabId) {
            nextControl = {
              ...control,
              parentId: undefined,
              tabId: undefined,
              layout: {
                ...control.layout,
                order: topLevelControls(withoutControl).length,
              },
            };
          } else {
            const existingChildren = tabChildControls(withoutControl, parentId, tabId);
            const defaultPosition = createTabChildLayout(existingChildren.length, control);
            const stayingInSameTab =
              control.parentId === parentId && control.tabId === tabId;
            nextControl = {
              ...control,
              parentId,
              tabId,
              layout: {
                ...control.layout,
                x: position?.x ?? (stayingInSameTab ? control.layout.x : defaultPosition.x),
                y: position?.y ?? (stayingInSameTab ? control.layout.y : defaultPosition.y),
                order: existingChildren.length,
              },
            };
          }

          let nextControls = [...withoutControl, nextControl];

          if (oldParentId && oldTabId) {
            nextControls = reindexTabChildOrders(nextControls, oldParentId, oldTabId);
          }

          if (parentId && tabId) {
            nextControls = reindexTabChildOrders(nextControls, parentId, tabId);
          } else {
            nextControls = reindexTopLevelOrders(nextControls);
          }

          return { controls: nextControls };
        });
      },
      removeTabChildren: (tabsControlId, tabId) =>
        set((state) => ({
          controls: reindexOrders(
            state.controls.filter(
              (control) =>
                !(control.parentId === tabsControlId && control.tabId === tabId),
            ),
          ),
        })),
      setOutput: (patch) =>
        set((state) => ({
          output: { ...state.output, ...patch },
        })),
      addOscSender: (patch) =>
        set((state) => {
          const sender = createOscSender({
            name: patch?.name ?? `OSC ${state.performerIo.oscSenders.length + 1}`,
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
        })),
      addOscReceiver: (patch) =>
        set((state) => {
          const receiver = createOscReceiver({
            name: patch?.name ?? `OSC In ${state.performerIo.oscReceivers.length + 1}`,
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
            name: patch?.name ?? `MIDI Out ${state.performerIo.midiOutputs.length + 1}`,
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
        })),
      addMidiInput: (patch) =>
        set((state) => {
          const endpoint = createMidiInputEndpoint({
            name: patch?.name ?? `MIDI In ${state.performerIo.midiInputs.length + 1}`,
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
      setMidiPorts: (ports) => set({ midiPorts: ports }),
      setMidiInputPorts: (ports) => set({ midiInputPorts: ports }),
      setControlValue: (id, value) =>
        set((state) => ({
          controlValues: {
            ...state.controlValues,
            [id]: Math.min(100, Math.max(0, value)),
          },
        })),
      setControlNoteActive: (id, note, active) =>
        set((state) => {
          const current = state.controlActiveNotes[id] ?? [];
          const next = active
            ? current.includes(note)
              ? current
              : [...current, note].sort((left, right) => left - right)
            : current.filter((value) => value !== note);

          return {
            controlActiveNotes: {
              ...state.controlActiveNotes,
              [id]: next,
            },
          };
        }),
      setControlPadValue: (id, x, y) =>
        set((state) => ({
          controlPadValues: {
            ...state.controlPadValues,
            [id]: {
              x: Math.min(100, Math.max(0, x)),
              y: Math.min(100, Math.max(0, y)),
            },
          },
        })),
      setControlTabIndex: (id, index) =>
        set((state) => ({
          controlTabIndex: {
            ...state.controlTabIndex,
            [id]: Math.max(0, Math.round(index)),
          },
        })),
      setDraggingControlId: (id) => set({ draggingControlId: id }),
      setDragHoverTabsId: (id) => set({ dragHoverTabsId: id }),
      setTabDropPreview: (preview) => set({ tabDropPreview: preview }),
      getSensorAxisMapping: (sensorId, axis) => {
        const key = sensorAxisKey(sensorId, axis);
        const output = get().output;
        const stored = get().sensorMappings[key];
        return stored
          ? normalizeSensorAxisMapping(stored, output, sensorId, axis)
          : defaultSensorAxisMapping(sensorId, axis, output);
      },
      updateSensorAxisMapping: (sensorId, axis, patch) => {
        const key = sensorAxisKey(sensorId, axis);
        const output = get().output;
        const stored = get().sensorMappings[key];
        const current = stored
          ? normalizeSensorAxisMapping(stored, output, sensorId, axis)
          : defaultSensorAxisMapping(sensorId, axis, output);

        set((state) => ({
          sensorMappings: {
            ...state.sensorMappings,
            [key]: {
              ...current,
              ...patch,
              osc: { ...current.osc, ...patch.osc },
              midi: { ...current.midi, ...patch.midi },
            },
          },
        }));
      },
      setLastError: (message) => set({ lastError: message }),
      importConfig: (config) =>
        set({
          controls: reindexOrders(config.controls),
          output: config.output,
          performerIo: config.performerIo,
          layoutSettings: config.layoutSettings,
          selectedControlId: null,
          inspectorControlId: null,
          controlValues: {},
          controlActiveNotes: {},
          controlPadValues: {},
          controlTabIndex: {},
        }),
    }),
    {
      name: "wd3000-layout",
      version: 8,
      migrate: (persistedState, version) => {
        const state = persistedState as {
          controls?: Array<
            Control & {
              protocol?: Control["protocol"];
              layout?: Partial<ControlLayout>;
            }
          >;
          output?: OutputConfig & { protocol?: Control["protocol"] };
          performerIo?: PerformerIoConfig;
          layoutSettings?: LayoutSettings & { mode?: string };
          sensorMappings?: Record<string, SensorAxisMapping>;
        };

        const legacyProtocol = state.output?.protocol ?? "osc";
        const rawOutput = state.output ?? defaultOutputConfig();
        const { protocol: _legacyProtocol, ...connectionSettings } = rawOutput as OutputConfig & {
          protocol?: Control["protocol"];
        };
        const output: OutputConfig = {
          ...defaultOutputConfig(),
          ...connectionSettings,
          oscListenPort:
            typeof connectionSettings.oscListenPort === "number"
              ? connectionSettings.oscListenPort
              : defaultOutputConfig().oscListenPort,
          midiInputPortName:
            connectionSettings.midiInputPortName === undefined
              ? null
              : connectionSettings.midiInputPortName,
        };

        const performerIo =
          state.performerIo && version >= 8
            ? state.performerIo
            : defaultPerformerIoConfig(output);

        const controls = (state.controls ?? []).map((control, index) => {
          const protocol = control.protocol ?? legacyProtocol;
          const ioAssignments =
            version >= 8
              ? {
                  oscSenderId: control.oscSenderId ?? null,
                  midiOutputId: control.midiOutputId ?? null,
                  oscReceiverId: control.oscReceiverId ?? null,
                  midiInputId: control.midiInputId ?? null,
                }
              : defaultControlIoAssignments(performerIo, protocol);

          return {
            ...control,
            protocol,
            ...ioAssignments,
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
          };
        }

        if (version < 3) {
          return {
            ...state,
            output,
            performerIo,
            controls,
          };
        }

        if (version < 4) {
          return {
            ...state,
            output,
            performerIo,
            controls,
            sensorMappings: {},
          };
        }

        const sensorMappings = Object.fromEntries(
          Object.entries(state.sensorMappings ?? {}).map(([key, mapping]) => {
            const [sensorId, axis] = key.split(":");
            return [
              key,
              normalizeSensorAxisMapping(mapping, output, sensorId, axis),
            ];
          }),
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
            layoutSettings,
          };
        }

        return {
          ...state,
          output,
          performerIo,
          controls,
          sensorMappings,
          layoutSettings: {
            gridSize:
              typeof state.layoutSettings?.gridSize === "number"
                ? state.layoutSettings.gridSize
                : defaultLayoutSettings().gridSize,
          },
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<
          Pick<
            AppState,
            "controls" | "output" | "performerIo" | "layoutSettings" | "sensorMappings"
          >
        >;

        return {
          ...currentState,
          ...persisted,
          mode: "edit",
          activeView: "performer",
          performerSubView: "ui",
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
      }),
    },
  ),
);
