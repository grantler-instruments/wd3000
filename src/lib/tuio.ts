import { invoke } from "@tauri-apps/api/core";
import i18n from "../i18n";

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

export const TUIO_ENTITY_KINDS = [
  "cursor",
  "object",
  "blob",
  "pointer",
  "token",
  "bounds",
  "symbol",
] as const;

export function tuioEntityLabel(kind: string): string {
  switch (kind) {
    case "cursor":
      return i18n.t("tuio.cursor");
    case "object":
      return i18n.t("tuio.object");
    case "blob":
      return i18n.t("tuio.blob");
    case "pointer":
      return i18n.t("tuio.pointer");
    case "token":
      return i18n.t("tuio.token");
    case "bounds":
      return i18n.t("tuio.bounds");
    case "symbol":
      return i18n.t("tuio.symbol");
    default:
      return kind;
  }
}
