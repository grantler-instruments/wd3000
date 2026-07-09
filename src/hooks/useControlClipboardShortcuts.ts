import { useEffect } from "react";
import { isTextInputTarget } from "../lib/platform";
import { useAppStore } from "../store/useAppStore";

export function useControlClipboardShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return;
      }

      const store = useAppStore.getState();
      const selectedId = store.selectedControlId;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        store.removeControl(selectedId);
        return;
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "c" && selectedId) {
        event.preventDefault();
        store.copyControl(selectedId);
        return;
      }

      if (key === "x" && selectedId) {
        event.preventDefault();
        store.cutControl(selectedId);
        return;
      }

      if (key === "v" && store.controlClipboard) {
        event.preventDefault();
        store.pasteControl();
        return;
      }

      if (key === "d" && selectedId) {
        event.preventDefault();
        store.duplicateControl(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
