import {
  Control,
  controlTabs,
  isTopLevelControl,
  tabChildControls,
  topLevelControls,
} from "../../types";

export function reindexTopLevelOrders(controls: Control[]): Control[] {
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

export function reindexTabChildOrders(
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

export function reindexOrders(controls: Control[]): Control[] {
  const topLevel = reindexTopLevelOrders(controls);
  const tabsControls = topLevel.filter((control) => control.type === "tabs");

  return tabsControls.reduce((next, tabsControl) => {
    return controlTabs(tabsControl).reduce(
      (acc, tab) => reindexTabChildOrders(acc, tabsControl.id, tab.id),
      next,
    );
  }, topLevel);
}

export function collectDescendantIds(controls: Control[], rootId: string): Set<string> {
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
