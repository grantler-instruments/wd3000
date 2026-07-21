import {
  OUTGOING_CURSOR_COLOR,
  TUIO_ENTITY_COLORS,
  type TuioEntity,
  type TuioFrame,
  tuioEntityLabel,
} from "../../lib/tuio";

export const DEFAULT_TUIO_PORT = 3333;

export interface OutgoingCursor {
  sessionId: number;
  x: number;
  y: number;
}

export interface TuioLogEntry {
  id: number;
  timestamp: number;
  summary: string;
}

export function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const base = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

export function entityLabel(entity: TuioEntity) {
  const kind = tuioEntityLabel(entity.kind);
  const details: string[] = [`#${entity.sessionId}`];

  if (entity.classId != null) {
    details.push(`class ${entity.classId}`);
  }
  if (entity.group) {
    details.push(entity.group);
  }
  if (entity.data) {
    details.push(entity.data);
  }

  return `${kind} ${details.join(" · ")}`;
}

export function entityPosition(entity: TuioEntity) {
  if (entity.x == null || entity.y == null) {
    return "—";
  }

  return `${entity.x.toFixed(3)}, ${entity.y.toFixed(3)}`;
}

function drawEntity(
  context: CanvasRenderingContext2D,
  entity: TuioEntity,
  width: number,
  height: number,
) {
  if (entity.x == null || entity.y == null) {
    return;
  }

  const color = TUIO_ENTITY_COLORS[entity.kind] ?? "#ffffff";
  const x = entity.x * width;
  const y = entity.y * height;
  const angle = entity.angle ?? 0;

  context.save();
  context.translate(x, y);
  context.rotate(angle);

  switch (entity.kind) {
    case "cursor": {
      context.beginPath();
      context.fillStyle = color;
      context.arc(0, 0, 10, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.9)";
      context.lineWidth = 2;
      context.stroke();
      break;
    }
    case "pointer": {
      const radius = Math.max(8, (entity.radius ?? 0.02) * Math.min(width, height));
      context.beginPath();
      context.fillStyle = `${color}88`;
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      break;
    }
    case "object": {
      const size = 28;
      context.fillStyle = `${color}55`;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.strokeRect(-size / 2, -size / 2, size, size);
      break;
    }
    case "token": {
      const size = 24;
      context.fillStyle = `${color}66`;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -size / 2);
      context.lineTo(size / 2, 0);
      context.lineTo(0, size / 2);
      context.lineTo(-size / 2, 0);
      context.closePath();
      context.fill();
      context.stroke();
      break;
    }
    case "blob":
    case "bounds": {
      const boxWidth = Math.max(24, (entity.width ?? 0.08) * width);
      const boxHeight = Math.max(24, (entity.height ?? 0.08) * height);
      context.fillStyle = `${color}33`;
      context.strokeStyle = color;
      context.lineWidth = 2;
      if (entity.kind === "blob") {
        context.beginPath();
        context.ellipse(0, 0, boxWidth / 2, boxHeight / 2, 0, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      } else {
        context.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
      }
      break;
    }
    default:
      break;
  }

  context.restore();

  context.save();
  context.fillStyle = "#ffffff";
  context.font = "11px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";

  let label = String(entity.sessionId);
  if (entity.classId != null) {
    label = String(entity.classId);
  }

  context.fillText(label, x, y);
  context.restore();
}

function drawOutgoingCursor(
  context: CanvasRenderingContext2D,
  cursor: OutgoingCursor,
  width: number,
  height: number,
) {
  const x = cursor.x * width;
  const y = cursor.y * height;

  context.save();
  context.beginPath();
  context.fillStyle = `${OUTGOING_CURSOR_COLOR}aa`;
  context.arc(x, y, 10, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = OUTGOING_CURSOR_COLOR;
  context.lineWidth = 2;
  context.setLineDash([4, 3]);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#000000";
  context.font = "bold 11px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(cursor.sessionId), x, y);
  context.restore();
}

export function drawSurface(
  canvas: HTMLCanvasElement,
  frame: TuioFrame | null,
  outgoingCursors: OutgoingCursor[],
  containerWidth: number,
  containerHeight: number,
) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(containerWidth));
  const height = Math.max(1, Math.floor(containerHeight));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  context.fillStyle = "#121212";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  const gridSteps = 10;
  for (let step = 1; step < gridSteps; step += 1) {
    const x = (width / gridSteps) * step;
    const y = (height / gridSteps) * step;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(255,255,255,0.25)";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (!frame) {
    return;
  }

  const drawable = frame.entities.filter((entity) => entity.x != null && entity.y != null);

  for (const entity of drawable) {
    drawEntity(context, entity, width, height);
  }

  for (const cursor of outgoingCursors) {
    drawOutgoingCursor(context, cursor, width, height);
  }
}
