import { useAppStore } from "../store/useAppStore";
import { controlTabs, LAYOUT_GRID_SIZE, snapToGrid, type TabDropPreview } from "../types";

export function dropPositionInElement(
  clientX: number,
  clientY: number,
  element: HTMLElement,
  gridSize = LAYOUT_GRID_SIZE,
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.max(0, snapToGrid(clientX - rect.left, gridSize)),
    y: Math.max(0, snapToGrid(clientY - rect.top, gridSize)),
  };
}

export function resolveTabDropAtPoint(
  clientX: number,
  clientY: number,
  gridSize = LAYOUT_GRID_SIZE,
  excludeControlId?: string | null,
): TabDropPreview | null {
  const elements = document.elementsFromPoint(clientX, clientY);

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (excludeControlId && element.closest(`[data-control-frame="${excludeControlId}"]`)) {
      continue;
    }

    const target = element.closest("[data-tab-drop-target]");
    if (!target || !(target instanceof HTMLElement)) {
      continue;
    }

    const tabsControlId = target.dataset.tabDropTarget;
    const tabId = target.dataset.tabId;
    if (!tabsControlId || !tabId) {
      continue;
    }

    const position = dropPositionInElement(clientX, clientY, target, gridSize);
    return {
      tabsControlId,
      tabId,
      x: position.x,
      y: position.y,
    };
  }

  return null;
}

export function resolveCanvasDropAtPoint(
  clientX: number,
  clientY: number,
  gridSize = LAYOUT_GRID_SIZE,
): { x: number; y: number } | null {
  const canvas = document.querySelector("[data-control-canvas]");
  if (!(canvas instanceof HTMLElement)) {
    return null;
  }

  const underPointer = document.elementsFromPoint(clientX, clientY);
  const overCanvas = underPointer.some(
    (element) => element === canvas || (element instanceof Node && canvas.contains(element)),
  );
  if (!overCanvas) {
    return null;
  }

  return dropPositionInElement(clientX, clientY, canvas, gridSize);
}

export function setTabDropHover(preview: TabDropPreview | null): void {
  const store = useAppStore.getState();
  store.setTabDropPreview(preview);
  store.setDragHoverTabsId(preview?.tabsControlId ?? null);
}

export function assignControlToHoveredTab(
  controlId: string,
  tabsControlId: string,
  position?: { x: number; y: number },
): boolean {
  const store = useAppStore.getState();
  const { controls, controlTabIndex, assignControlToTab, tabDropPreview } = store;

  if (controlId === tabsControlId) {
    return false;
  }

  const parent = controls.find((control) => control.id === tabsControlId);
  if (parent?.type !== "tabs") {
    return false;
  }

  const source = controls.find((control) => control.id === controlId);
  if (!source || source.type === "tabs") {
    return false;
  }

  const tabs = controlTabs(parent);
  const activeIndex = Math.min(controlTabIndex[parent.id] ?? 0, Math.max(0, tabs.length - 1));
  const activeTab = tabs[activeIndex];
  if (!activeTab) {
    return false;
  }

  const targetTabId =
    tabDropPreview?.tabsControlId === tabsControlId ? tabDropPreview.tabId : activeTab.id;

  if (source.parentId === parent.id && source.tabId === targetTabId) {
    return false;
  }

  const dropPosition =
    position ??
    (tabDropPreview?.tabsControlId === tabsControlId && tabDropPreview.tabId === targetTabId
      ? { x: tabDropPreview.x, y: tabDropPreview.y }
      : undefined);

  assignControlToTab(controlId, parent.id, targetTabId, dropPosition);
  return true;
}
