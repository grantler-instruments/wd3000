import type { Control, ControlLayout, ControlType, LayoutSettings } from "./control";

export const CONTROL_MIN_WIDTH = 180;
export const CONTROL_DEFAULT_WIDTH = 240;
export const KEYBOARD_MIN_WIDTH = 360;
export const KEYBOARD_DEFAULT_WIDTH = 480;
export const LAYOUT_GRID_SIZE = 16;
export const CONTROL_MIN_HEIGHT = 120;
export const CONTROL_ESTIMATED_HEIGHT = 168;
export const SLIDER_VERTICAL_ESTIMATED_HEIGHT = 280;
export const KEYBOARD_ESTIMATED_HEIGHT = 200;

export const KEYBOARD_MIN_OCTAVES = 1;
export const KEYBOARD_MAX_OCTAVES = 3;
export const KEYBOARD_DEFAULT_OCTAVES = 2;
export const KEYBOARD_DEFAULT_VELOCITY = 100;
export const KEYBOARD_BODY_HEIGHT = 120;
export const PAD_BODY_HEIGHT = 160;
export const PAD_ESTIMATED_HEIGHT = 200;
export const ROTARY_ESTIMATED_HEIGHT = 200;
export const ROTARY_MIN_HEIGHT = 160;
export const TABS_ESTIMATED_HEIGHT = 240;
export const TABS_MIN_HEIGHT = 160;

export const defaultLayoutSettings = (): LayoutSettings => ({
  gridSize: LAYOUT_GRID_SIZE,
});

export function createTabChildLayout(
  index: number,
  control: Control,
): Pick<ControlLayout, "x" | "y"> {
  const width = control.layout.width;
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (controlLayoutHeight(control) + LAYOUT_GRID_SIZE),
  };
}

export function tabPanelContentSize(
  children: Control[],
  panelSize: { width: number; height: number },
): { width: number; height: number } {
  if (children.length === 0) {
    return panelSize;
  }

  const contentWidth =
    Math.max(...children.map((control) => control.layout.x + control.layout.width)) +
    LAYOUT_GRID_SIZE * 2;
  const contentHeight =
    Math.max(...children.map((control) => control.layout.y + controlLayoutHeight(control))) +
    LAYOUT_GRID_SIZE * 2;

  return {
    width: Math.max(panelSize.width, contentWidth),
    height: Math.max(panelSize.height, contentHeight),
  };
}

export function isTopLevelControl(control: Control): boolean {
  return !control.parentId;
}

export function sortControlsByOrder(controls: Control[]): Control[] {
  return [...controls].sort((left, right) => left.layout.order - right.layout.order);
}

export function topLevelControls(controls: Control[]): Control[] {
  return sortControlsByOrder(controls.filter(isTopLevelControl));
}

export function tabChildControls(controls: Control[], parentId: string, tabId: string): Control[] {
  return sortControlsByOrder(
    controls.filter((control) => control.parentId === parentId && control.tabId === tabId),
  );
}

export function pruneOrphanTabChildren(
  controls: Control[],
  tabsControlId: string,
  validTabIds: Set<string>,
): Control[] {
  return controls.filter(
    (control) =>
      control.parentId !== tabsControlId ||
      (control.tabId !== undefined && validTabIds.has(control.tabId)),
  );
}

export function createControlLayout(index: number): ControlLayout {
  const width = CONTROL_DEFAULT_WIDTH;
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (CONTROL_ESTIMATED_HEIGHT + LAYOUT_GRID_SIZE),
    width,
    height: CONTROL_ESTIMATED_HEIGHT,
    order: index,
  };
}

function controlDefaultWidth(type: ControlType): number {
  if (type === "keyboard") {
    return KEYBOARD_DEFAULT_WIDTH;
  }

  if (type === "pad") {
    return CONTROL_DEFAULT_WIDTH;
  }

  return CONTROL_DEFAULT_WIDTH;
}

export function createControlLayoutForType(type: ControlType, index: number): ControlLayout {
  const width = controlDefaultWidth(type);
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: LAYOUT_GRID_SIZE + column * (width + LAYOUT_GRID_SIZE),
    y: LAYOUT_GRID_SIZE + row * (CONTROL_ESTIMATED_HEIGHT + LAYOUT_GRID_SIZE),
    width,
    height: defaultHeightForType(type),
    order: index,
  };
}

function defaultHeightForType(type: ControlType, control?: Control): number {
  if (control && isVerticalSlider(control)) {
    return SLIDER_VERTICAL_ESTIMATED_HEIGHT;
  }

  switch (type) {
    case "keyboard":
      return KEYBOARD_ESTIMATED_HEIGHT;
    case "pad":
      return PAD_ESTIMATED_HEIGHT;
    case "rotary":
      return ROTARY_ESTIMATED_HEIGHT;
    case "tabs":
      return TABS_ESTIMATED_HEIGHT;
    default:
      return CONTROL_ESTIMATED_HEIGHT;
  }
}

export function controlLayoutHeight(control: Control): number {
  return control.layout.height ?? defaultHeightForType(control.type, control);
}

export function controlMinHeight(control: Control): number {
  switch (control.type) {
    case "keyboard":
      return 140;
    case "pad":
      return 140;
    case "rotary":
      return ROTARY_MIN_HEIGHT;
    case "tabs":
      return TABS_MIN_HEIGHT;
    case "slider":
      return isVerticalSlider(control) ? 200 : CONTROL_MIN_HEIGHT;
    default:
      return CONTROL_MIN_HEIGHT;
  }
}

export function controlMinWidth(type: ControlType): number {
  if (type === "keyboard") {
    return KEYBOARD_MIN_WIDTH;
  }

  return CONTROL_MIN_WIDTH;
}

export function controlCanvasSizeLimits(
  control: Control,
  canvas: { width: number; height: number },
  subtractPosition = true,
): {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
} {
  const minWidth = controlMinWidth(control.type);
  const minHeight = controlMinHeight(control);
  const offsetX = subtractPosition ? control.layout.x : 0;
  const offsetY = subtractPosition ? control.layout.y : 0;

  return {
    minWidth,
    maxWidth: Math.max(minWidth, canvas.width - offsetX),
    minHeight,
    maxHeight: Math.max(minHeight, canvas.height - offsetY),
  };
}

export function isVerticalSlider(control: Control): boolean {
  return control.type === "slider" && control.sliderOrientation === "vertical";
}

export function controlEstimatedHeight(control: Control | ControlType): number {
  if (typeof control !== "string") {
    return controlLayoutHeight(control);
  }

  return defaultHeightForType(control);
}

export function controlFreeLayoutHeight(control: Control): number {
  return controlLayoutHeight(control);
}

export function keyboardNoteRange(control: Control): { start: number; end: number } {
  const octaves = control.midi.octaves ?? KEYBOARD_DEFAULT_OCTAVES;
  const start = control.midi.note;
  return {
    start,
    end: start + octaves * 12 - 1,
  };
}

export function keyboardNotes(control: Control): number[] {
  const { start, end } = keyboardNoteRange(control);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function isBlackKey(note: number): boolean {
  const pitch = note % 12;
  return pitch === 1 || pitch === 3 || pitch === 6 || pitch === 8 || pitch === 10;
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function canvasHeight(controls: Control[]): number {
  const topLevel = topLevelControls(controls);

  if (topLevel.length === 0) {
    return 480;
  }

  return (
    Math.max(...topLevel.map((control) => control.layout.y + controlEstimatedHeight(control))) +
    LAYOUT_GRID_SIZE * 2
  );
}
