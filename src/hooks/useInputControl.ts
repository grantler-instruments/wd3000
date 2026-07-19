import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import {
  type ControlInputUpdate,
  type MidiCcInputMessage,
  type MidiNoteInputMessage,
  type OscInputMessage,
  routeMidiCcMessage,
  routeMidiNoteMessage,
  routeOscMessage,
} from "../lib/inputRouter";
import { collectPerformerListenPorts, collectPerformerMidiInputPorts } from "../lib/performerIo";
import { isNativeApp } from "../lib/platform";
import { clearInputListenerNeed, setInputListenerNeed } from "../lib/sharedInputListeners";
import { setWebMidiControlHandlers } from "../lib/webMidi";
import { useAppStore } from "../store/useAppStore";
import { DEFAULT_CONTROL_PAD_VALUE } from "../types";

export function useInputControl() {
  const mode = useAppStore((state) => state.mode);
  const performerIo = useAppStore((state) => state.performerIo);
  const controls = useAppStore((state) => state.controls);
  const setControlValue = useAppStore((state) => state.setControlValue);
  const setControlNoteActive = useAppStore((state) => state.setControlNoteActive);
  const setControlPadValue = useAppStore((state) => state.setControlPadValue);
  const setControlTabIndex = useAppStore((state) => state.setControlTabIndex);

  useEffect(() => {
    if (mode !== "play") {
      void clearInputListenerNeed("performer");
      return;
    }

    let cancelled = false;
    const oscPorts = collectPerformerListenPorts(performerIo, controls);
    const midiPorts = collectPerformerMidiInputPorts(performerIo, controls);

    void setInputListenerNeed("performer", {
      oscListenPort: oscPorts[0] ?? 0,
      midiInputPortName: midiPorts[0] ?? null,
    }).catch((error) => {
      if (!cancelled) {
        useAppStore.getState().setLastError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      cancelled = true;
      void clearInputListenerNeed("performer");
    };
  }, [controls, mode, performerIo]);

  useEffect(() => {
    if (mode !== "play") {
      return;
    }

    const applyUpdates = (updates: ControlInputUpdate[]) => {
      for (const update of updates) {
        if ("note" in update) {
          setControlNoteActive(update.controlId, update.note, update.active);
          continue;
        }

        if ("axis" in update) {
          const current =
            useAppStore.getState().controlPadValues[update.controlId] ?? DEFAULT_CONTROL_PAD_VALUE;
          setControlPadValue(
            update.controlId,
            update.axis === "x" ? update.value : current.x,
            update.axis === "y" ? update.value : current.y,
          );
          continue;
        }

        if ("tabIndex" in update) {
          setControlTabIndex(update.controlId, update.tabIndex);
          continue;
        }

        setControlValue(update.controlId, update.value);
      }
    };

    if (!isNativeApp()) {
      setWebMidiControlHandlers({
        onNote: (message: MidiNoteInputMessage) => {
          applyUpdates(routeMidiNoteMessage(controls, message));
        },
        onCc: (message: MidiCcInputMessage) => {
          applyUpdates(routeMidiCcMessage(controls, message));
        },
      });

      return () => {
        setWebMidiControlHandlers({});
      };
    }

    const unlisteners = [
      listen<OscInputMessage>("control-input-osc", (event) => {
        applyUpdates(routeOscMessage(controls, event.payload));
      }),
      listen<MidiNoteInputMessage>("control-input-midi-note", (event) => {
        applyUpdates(routeMidiNoteMessage(controls, event.payload));
      }),
      listen<MidiCcInputMessage>("control-input-midi-cc", (event) => {
        applyUpdates(routeMidiCcMessage(controls, event.payload));
      }),
    ];

    return () => {
      void Promise.all(unlisteners).then((handlers) => {
        for (const unlisten of handlers) {
          unlisten();
        }
      });
    };
  }, [
    controls,
    mode,
    setControlNoteActive,
    setControlPadValue,
    setControlTabIndex,
    setControlValue,
  ]);
}
