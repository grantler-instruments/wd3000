import { Control } from "../types";

export interface ControlClipboard {
  rootId: string;
  controls: Control[];
  mode: "copy" | "cut";
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

export function collectControlSubtree(controls: Control[], rootId: string): Control[] {
  const ids = collectDescendantIds(controls, rootId);
  return controls.filter((control) => ids.has(control.id));
}

export function cloneControlSubtree(
  snapshot: Control[],
  rootId: string,
  options?: {
    position?: { x: number; y: number };
    positionOffset?: { x: number; y: number };
    toTopLevel?: boolean;
  },
): { controls: Control[]; rootId: string | null } {
  const subtreeIds = collectDescendantIds(snapshot, rootId);
  const subtree = snapshot.filter((control) => subtreeIds.has(control.id));
  const root = subtree.find((control) => control.id === rootId);

  if (!root) {
    return { controls: [], rootId: null };
  }

  const idMap = new Map<string, string>();
  const tabIdMap = new Map<string, string>();

  for (const control of subtree) {
    idMap.set(control.id, crypto.randomUUID());
    if (control.type === "tabs") {
      for (const tab of control.tabs ?? []) {
        tabIdMap.set(tab.id, crypto.randomUUID());
      }
    }
  }

  const newRootId = idMap.get(rootId)!;
  const controls = subtree.map((control) => {
    const isRoot = control.id === rootId;
    let layout = { ...control.layout };

    if (isRoot) {
      if (options?.position) {
        layout = { ...layout, x: options.position.x, y: options.position.y };
      } else if (options?.positionOffset) {
        layout = {
          ...layout,
          x: layout.x + options.positionOffset.x,
          y: layout.y + options.positionOffset.y,
        };
      }
    }

    return {
      ...control,
      id: idMap.get(control.id)!,
      layout,
      tabs: control.tabs?.map((tab) => ({
        ...tab,
        id: tabIdMap.get(tab.id) ?? crypto.randomUUID(),
      })),
      parentId:
        isRoot && options?.toTopLevel
          ? undefined
          : control.parentId
            ? (idMap.get(control.parentId) ?? control.parentId)
            : undefined,
      tabId:
        isRoot && options?.toTopLevel
          ? undefined
          : control.tabId
            ? (tabIdMap.get(control.tabId) ?? control.tabId)
            : undefined,
    };
  });

  return { controls, rootId: newRootId };
}
