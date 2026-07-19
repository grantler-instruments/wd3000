import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import type { SynthParams } from "../audio/instruments/Synth";
import {
  getSynthRuntimeSnapshot,
  subscribeSynthRuntime,
  synthAllNotesOff,
  synthNoteOff,
  synthNoteOn,
  synthSetInstrument,
  synthSetMasterGain,
  synthSetMidiChannel,
  synthSetParams,
  synthSetRhodesParams,
} from "../audio/synthRuntime";
import type { MidiCcInputMessage, MidiNoteInputMessage } from "../lib/inputRouter";
import type { OscArgPayload } from "../lib/oscMessages";
import { isNativeApp } from "../lib/platform";
import { clearInputListenerNeed, setInputListenerNeed } from "../lib/sharedInputListeners";
import { parseSynthOscMessage } from "../lib/synthOsc";
import { setWebMidiSynthHandlers } from "../lib/webMidi";
import { useAppStore } from "../store/useAppStore";

function applyOscAction(
  action: ReturnType<typeof parseSynthOscMessage>,
  setSynthMasterGain: (gain: number) => void,
  setSynthParam: <K extends keyof SynthParams>(key: K, value: SynthParams[K]) => void,
): void {
  if (!action) {
    return;
  }

  switch (action.type) {
    case "noteOn":
      synthNoteOn(action.channel, action.note, action.velocity);
      break;
    case "noteOff":
      synthNoteOff(action.channel, action.note);
      break;
    case "allNotesOff":
      synthAllNotesOff();
      break;
    case "gain":
      setSynthMasterGain(action.value);
      void synthSetMasterGain(action.value);
      break;
    case "param":
      setSynthParam(action.key, action.value as SynthParams[typeof action.key]);
      void synthSetParams({ [action.key]: action.value });
      break;
  }
}

/**
 * Keeps MIDI/OSC bridges and param sync alive while the synth runs.
 * Start/stop is owned by the Start button (user gesture + no Strict Mode races).
 */
export function useSynthRuntime() {
  const synthRunning = useAppStore((state) => state.synthRunning);
  const synthConfig = useAppStore((state) => state.synthConfig);
  const setSynthRunning = useAppStore((state) => state.setSynthRunning);
  const setSynthMasterGain = useAppStore((state) => state.setSynthMasterGain);
  const setSynthParam = useAppStore((state) => state.setSynthParam);
  const setLastError = useAppStore((state) => state.setLastError);

  useEffect(() => {
    return subscribeSynthRuntime(() => {
      const snapshot = getSynthRuntimeSnapshot();
      if (snapshot.status === "error" && snapshot.lastError) {
        setLastError(snapshot.lastError);
        setSynthRunning(false);
      }
    });
  }, [setLastError, setSynthRunning]);

  // Keep MIDI/OSC ports open while the synth is running (independent of play mode).
  useEffect(() => {
    if (!synthRunning) {
      void clearInputListenerNeed("synth");
      return;
    }

    void setInputListenerNeed("synth", {
      oscListenPort: isNativeApp() ? synthConfig.oscListenPort : 0,
      midiInputPortName: synthConfig.midiInputPortName,
    });

    return () => {
      void clearInputListenerNeed("synth");
    };
  }, [synthConfig.midiInputPortName, synthConfig.oscListenPort, synthRunning]);

  // Push param / channel / instrument changes into the live engine.
  useEffect(() => {
    if (!getSynthRuntimeSnapshot().running) {
      return;
    }
    synthSetMidiChannel(synthConfig.midiChannel);
    void synthSetMasterGain(synthConfig.masterGain);
    void synthSetInstrument(synthConfig.instrument);
    void synthSetParams(synthConfig.params);
    void synthSetRhodesParams(synthConfig.rhodesParams);
  }, [synthConfig]);

  // MIDI + OSC → synth (always subscribed while running; not tied to widget routing).
  useEffect(() => {
    if (!synthRunning) {
      setWebMidiSynthHandlers({});
      return;
    }

    const onNote = (message: MidiNoteInputMessage) => {
      if (message.velocity > 0) {
        synthNoteOn(message.channel, message.note, message.velocity);
      } else {
        synthNoteOff(message.channel, message.note);
      }
    };

    const onCc = (message: MidiCcInputMessage) => {
      if (message.cc === 7) {
        const gain = message.value / 127;
        setSynthMasterGain(gain);
        void synthSetMasterGain(gain);
      }
    };

    if (!isNativeApp()) {
      setWebMidiSynthHandlers({ onNote, onCc });
      return () => {
        setWebMidiSynthHandlers({});
      };
    }

    const prefix = () => useAppStore.getState().synthConfig.oscAddressPrefix;

    const unlisteners = [
      listen<MidiNoteInputMessage>("control-input-midi-note", (event) => {
        onNote(event.payload);
      }),
      listen<MidiCcInputMessage>("control-input-midi-cc", (event) => {
        onCc(event.payload);
      }),
      listen<{ address: string; args?: OscArgPayload[] }>("osc-debug-message", (event) => {
        const action = parseSynthOscMessage(
          event.payload.address,
          event.payload.args ?? [],
          prefix(),
        );
        applyOscAction(action, setSynthMasterGain, setSynthParam);
      }),
    ];

    return () => {
      void Promise.all(unlisteners).then((handlers) => {
        for (const unlisten of handlers) {
          unlisten();
        }
      });
    };
  }, [setSynthMasterGain, setSynthParam, synthRunning]);
}
