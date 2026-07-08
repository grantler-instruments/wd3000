import { invoke } from "@tauri-apps/api/core";

export interface TuioEntity {
  kind: string;
  sessionId: number;
  x?: number;
  y?: number;
  angle?: number;
  width?: number;
  height?: number;
  radius?: number;
  classId?: number;
  typeUserId?: number;
  componentId?: number;
  area?: number;
  pressure?: number;
  group?: string;
  data?: string;
}

export interface TuioFrame {
  frame: number;
  entities: TuioEntity[];
}

export interface TuioCursorInput {
  sessionId: number;
  x: number;
  y: number;
}

export async function startTuioListener(port: number | null): Promise<void> {
  await invoke("start_tuio_listener", { port: port ?? 0 });
}

export async function stopTuioListener(): Promise<void> {
  await invoke("stop_tuio_listener");
}

export async function sendTuioCursors(
  host: string,
  port: number,
  cursors: TuioCursorInput[],
): Promise<void> {
  await invoke("send_tuio_cursors", { host, port, cursors });
}

export const OUTGOING_CURSOR_COLOR = "#ffee58";

export const TUIO_ENTITY_COLORS: Record<string, string> = {
  cursor: "#42a5f5",
  object: "#ffa726",
  blob: "#ab47bc",
  pointer: "#66bb6a",
  token: "#ef5350",
  bounds: "#26c6da",
  symbol: "#bdbdbd",
};

export const TUIO_ENTITY_LABELS: Record<string, string> = {
  cursor: "Cursor",
  object: "Object",
  blob: "Blob",
  pointer: "Pointer",
  token: "Token",
  bounds: "Bounds",
  symbol: "Symbol",
};
