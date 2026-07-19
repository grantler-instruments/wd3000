import {
  type Control,
  type ControlLayout,
  controlLayoutHeight,
  controlMinHeight,
  controlMinWidth,
  LAYOUT_GRID_SIZE,
  snapToGrid,
  tabChildControls,
  topLevelControls,
} from "../types";

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function snapDownToGrid(value: number, gridSize: number): number {
  return Math.floor(value / gridSize) * gridSize;
}

export function controlLayoutRect(control: Control): LayoutRect {
  return {
    x: control.layout.x,
    y: control.layout.y,
    width: control.layout.width,
    height: controlLayoutHeight(control),
  };
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function layoutOverlapsAny(rect: LayoutRect, obstacles: LayoutRect[]): boolean {
  return obstacles.some((obstacle) => rectsOverlap(rect, obstacle));
}

/** Controls that share the same free-layout surface (canvas or one tab panel). */
export function layoutPeers(controls: Control[], control: Control): Control[] {
  if (control.parentId && control.tabId) {
    return tabChildControls(controls, control.parentId, control.tabId).filter(
      (entry) => entry.id !== control.id,
    );
  }

  return topLevelControls(controls).filter((entry) => entry.id !== control.id);
}

export function peerRects(controls: Control[], control: Control): LayoutRect[] {
  return layoutPeers(controls, control).map(controlLayoutRect);
}

export function resolveNonOverlappingPosition(
  rect: LayoutRect,
  obstacles: LayoutRect[],
  gridSize = LAYOUT_GRID_SIZE,
): Pick<LayoutRect, "x" | "y"> {
  const preferred = {
    ...rect,
    x: Math.max(0, snapToGrid(rect.x, gridSize)),
    y: Math.max(0, snapToGrid(rect.y, gridSize)),
  };

  if (!layoutOverlapsAny(preferred, obstacles)) {
    return { x: preferred.x, y: preferred.y };
  }

  const maxRadius = 96;
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = {
          ...preferred,
          x: Math.max(0, preferred.x + dx * gridSize),
          y: Math.max(0, preferred.y + dy * gridSize),
        };

        if (!layoutOverlapsAny(candidate, obstacles)) {
          return { x: candidate.x, y: candidate.y };
        }
      }
    }
  }

  const belowY =
    obstacles.length === 0
      ? preferred.y
      : Math.max(...obstacles.map((obstacle) => obstacle.y + obstacle.height)) + gridSize;

  return {
    x: preferred.x,
    y: Math.max(0, snapToGrid(belowY, gridSize)),
  };
}

export function resolveNonOverlappingSize(
  rect: LayoutRect,
  obstacles: LayoutRect[],
  minWidth: number,
  minHeight: number,
  gridSize = LAYOUT_GRID_SIZE,
): Pick<LayoutRect, "width" | "height"> {
  let width = Math.max(minWidth, snapToGrid(rect.width, gridSize));
  let height = Math.max(minHeight, snapToGrid(rect.height, gridSize));
  let next = { ...rect, width, height };

  if (!layoutOverlapsAny(next, obstacles)) {
    return { width, height };
  }

  for (let step = 0; step < 64 && layoutOverlapsAny(next, obstacles); step += 1) {
    let reduced = false;

    for (const obstacle of obstacles) {
      if (!rectsOverlap(next, obstacle)) {
        continue;
      }

      const clearWidth = obstacle.x - next.x;
      const clearHeight = obstacle.y - next.y;
      const canClearByWidth = clearWidth >= minWidth;
      const canClearByHeight = clearHeight >= minHeight;

      if (canClearByWidth && (!canClearByHeight || clearWidth >= clearHeight)) {
        const limited = Math.max(minWidth, snapDownToGrid(clearWidth, gridSize));
        if (limited < width) {
          width = limited;
          reduced = true;
        }
      } else if (canClearByHeight) {
        const limited = Math.max(minHeight, snapDownToGrid(clearHeight, gridSize));
        if (limited < height) {
          height = limited;
          reduced = true;
        }
      }
    }

    next = { ...rect, width, height };
    if (!reduced) {
      break;
    }
  }

  if (layoutOverlapsAny(next, obstacles)) {
    return { width: minWidth, height: minHeight };
  }

  return { width, height };
}

export function resolveControlLayout(
  controls: Control[],
  control: Control,
  nextLayout: ControlLayout,
  gridSize = LAYOUT_GRID_SIZE,
): ControlLayout {
  const obstacles = peerRects(controls, control);
  const minWidth = controlMinWidth(control.type);
  const minHeight = controlMinHeight({ ...control, layout: nextLayout });

  const width = Math.max(minWidth, nextLayout.width);
  const height = Math.max(minHeight, nextLayout.height);
  const position = resolveNonOverlappingPosition(
    {
      x: Math.max(0, nextLayout.x),
      y: Math.max(0, nextLayout.y),
      width,
      height,
    },
    obstacles,
    gridSize,
  );

  const size = resolveNonOverlappingSize(
    {
      x: position.x,
      y: position.y,
      width,
      height,
    },
    obstacles,
    minWidth,
    minHeight,
    gridSize,
  );

  return {
    ...nextLayout,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

export function resizeLimitsAgainstPeers(
  control: Control,
  canvasLimits: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  },
  obstacles: LayoutRect[],
): {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
} {
  const { x, y } = control.layout;
  const height = controlLayoutHeight(control);
  const width = control.layout.width;

  let maxWidth = canvasLimits.maxWidth;
  let maxHeight = canvasLimits.maxHeight;

  for (const obstacle of obstacles) {
    const verticalOverlap = y < obstacle.y + obstacle.height && y + height > obstacle.y;
    if (verticalOverlap && obstacle.x > x) {
      maxWidth = Math.min(
        maxWidth,
        Math.max(canvasLimits.minWidth, snapDownToGrid(obstacle.x - x, LAYOUT_GRID_SIZE)),
      );
    }

    const horizontalOverlap = x < obstacle.x + obstacle.width && x + width > obstacle.x;
    if (horizontalOverlap && obstacle.y > y) {
      maxHeight = Math.min(
        maxHeight,
        Math.max(canvasLimits.minHeight, snapDownToGrid(obstacle.y - y, LAYOUT_GRID_SIZE)),
      );
    }
  }

  return {
    ...canvasLimits,
    maxWidth: Math.max(canvasLimits.minWidth, maxWidth),
    maxHeight: Math.max(canvasLimits.minHeight, maxHeight),
  };
}
