import { useEffect, useSyncExternalStore } from "react";
import {
  canRedoPerformerEdit,
  canUndoPerformerEdit,
  getPerformerHistoryRevision,
  subscribePerformerHistory,
  subscribePerformerHistoryRevision,
} from "../lib/performer-history";

export function usePerformerHistory(): void {
  useEffect(() => subscribePerformerHistory(), []);
}

export function usePerformerHistoryAvailability(): {
  canUndo: boolean;
  canRedo: boolean;
} {
  useSyncExternalStore(
    subscribePerformerHistoryRevision,
    getPerformerHistoryRevision,
    getPerformerHistoryRevision,
  );

  return {
    canUndo: canUndoPerformerEdit(),
    canRedo: canRedoPerformerEdit(),
  };
}
