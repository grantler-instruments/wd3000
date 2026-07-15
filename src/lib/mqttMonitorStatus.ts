import { useSyncExternalStore } from "react";

export type MqttMonitorConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

export interface MqttMonitorStatusState {
  status: MqttMonitorConnectionStatus;
  detail: string | null;
}

const INITIAL_STATE: MqttMonitorStatusState = {
  status: "idle",
  detail: null,
};

let state: MqttMonitorStatusState = INITIAL_STATE;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function setMqttMonitorStatus(
  status: MqttMonitorConnectionStatus,
  detail: string | null = null,
) {
  if (state.status === status && state.detail === detail) {
    return;
  }
  state = { status, detail };
  notify();
}

export function resetMqttMonitorStatus() {
  setMqttMonitorStatus("idle", null);
}

export function getMqttMonitorStatusSnapshot() {
  return state;
}

export function useMqttMonitorStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
