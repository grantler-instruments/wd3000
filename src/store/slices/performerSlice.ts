import type { StateCreator } from "zustand";
import {
  type ControlClipboard,
  cloneControlSubtree,
  collectControlSubtree,
} from "../../lib/controlClipboard";
import {
  type Control,
  type ControlLayout,
  type ControlPadValue,
  type ControlType,
  controlTabs,
  createControl,
  createTabChildLayout,
  defaultLayoutSettings,
  type LayoutSettings,
  pruneOrphanTabChildren,
  type TabDropPreview,
  tabChildControls,
  topLevelControls,
} from "../../types";
import type { AppStore } from "../appStoreTypes";
import {
  collectDescendantIds,
  reindexOrders,
  reindexTabChildOrders,
  reindexTopLevelOrders,
} from "../helpers/controlTree";

export interface PerformerSlice {
  controls: Control[];
  layoutSettings: LayoutSettings;
  selectedControlId: string | null;
  inspectorControlId: string | null;
  controlValues: Record<string, number>;
  controlActiveNotes: Record<string, number[]>;
  controlPadValues: Record<string, ControlPadValue>;
  controlTabIndex: Record<string, number>;
  draggingControlId: string | null;
  dragHoverTabsId: string | null;
  tabDropPreview: TabDropPreview | null;
  controlClipboard: ControlClipboard | null;
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
  setControlValue: (id: string, value: number) => void;
  setControlNoteActive: (id: string, note: number, active: boolean) => void;
  setControlPadValue: (id: string, x: number, y: number) => void;
  setControlTabIndex: (id: string, index: number) => void;
  setDraggingControlId: (id: string | null) => void;
  setDragHoverTabsId: (id: string | null) => void;
  setTabDropPreview: (preview: TabDropPreview | null) => void;
}

export const createPerformerSlice: StateCreator<AppStore, [], [], PerformerSlice> = (set, get) => ({
  controls: [],
  layoutSettings: defaultLayoutSettings(),
  selectedControlId: null,
  inspectorControlId: null,
  controlValues: {},
  controlActiveNotes: {},
  controlPadValues: {},
  controlTabIndex: {},
  draggingControlId: null,
  dragHoverTabsId: null,
  tabDropPreview: null,
  controlClipboard: null,
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
  openControlInspector: (id) => set({ selectedControlId: id, inspectorControlId: id }),
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
        control.id === id ? { ...control, layout: { ...control.layout, ...patch } } : control,
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
        const stayingInSameTab = control.parentId === parentId && control.tabId === tabId;
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
          (control) => !(control.parentId === tabsControlId && control.tabId === tabId),
        ),
      ),
    })),
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
});
