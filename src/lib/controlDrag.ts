import { useAppStore } from "../store/useAppStore";
import {
  CONTROL_DRAG_MIME,
  controlTabs,
  LAYOUT_GRID_SIZE,
  readControlDragId,
  snapToGrid,
  type TabDropPreview,
} from "../types";

export function beginControlDrag(event: React.DragEvent<HTMLElement>, controlId: string): void {
  event.dataTransfer.setData("text/plain", controlId);
  event.dataTransfer.setData(CONTROL_DRAG_MIME, controlId);
  event.dataTransfer.effectAllowed = "move";

  const dragImage = new Image();
  dragImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  event.dataTransfer.setDragImage(dragImage, 0, 0);

  useAppStore.getState().setDraggingControlId(controlId);
}

export function endControlDrag(): void {
  const store = useAppStore.getState();
  store.setDraggingControlId(null);
  store.setDragHoverTabsId(null);
  store.setTabDropPreview(null);
}

export function resolveDroppedControlId(dataTransfer: DataTransfer): string | null {
  return readControlDragId(dataTransfer) ?? useAppStore.getState().draggingControlId;
}

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
  const excludeId = excludeControlId ?? useAppStore.getState().draggingControlId;
  const elements = document.elementsFromPoint(clientX, clientY);

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (excludeId && element.closest(`[data-control-frame="${excludeId}"]`)) {
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

export function assignDraggedControlToHoveredTab(): boolean {
  const { draggingControlId, dragHoverTabsId, tabDropPreview } = useAppStore.getState();

  if (!draggingControlId || !dragHoverTabsId) {
    return false;
  }

  const position =
    tabDropPreview?.tabsControlId === dragHoverTabsId
      ? { x: tabDropPreview.x, y: tabDropPreview.y }
      : undefined;

  return assignControlToHoveredTab(draggingControlId, dragHoverTabsId, position);
}
