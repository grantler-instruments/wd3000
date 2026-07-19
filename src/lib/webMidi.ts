import { pushDebugLog } from "./debugLog";
import type { MidiCcInputMessage, MidiNoteInputMessage } from "./inputRouter";
import { parseMidiInput } from "./midiInputParse";
import { asMidiPayload } from "./midiPayload";
import { isWebMidiSupported } from "./platform";

let midiAccess: MIDIAccess | null = null;
let connectedInput: MIDIInput | null = null;

let controlHandlers: {
  onNote?: (message: MidiNoteInputMessage) => void;
  onCc?: (message: MidiCcInputMessage) => void;
} = {};

export async function ensureMidiAccess(): Promise<MIDIAccess> {
  if (midiAccess) {
    return midiAccess;
  }

  if (!isWebMidiSupported()) {
    throw new Error("Web MIDI is not supported in this browser");
  }

  midiAccess = await navigator.requestMIDIAccess({ sysex: true });
  return midiAccess;
}

function findInputPort(access: MIDIAccess, name: string): MIDIInput | undefined {
  return [...access.inputs.values()].find((port) => port.name === name);
}

function findOutputPort(access: MIDIAccess, name: string): MIDIOutput | undefined {
  return [...access.outputs.values()].find((port) => port.name === name);
}

function handleIncomingMidi(event: MIDIMessageEvent) {
  const bytes = Array.from(event.data ?? []);
  const parsed = parseMidiInput(bytes);
  if (!parsed) {
    return;
  }

  if (parsed.controlNote && controlHandlers.onNote) {
    controlHandlers.onNote(parsed.controlNote);
  }

  if (parsed.controlCc && controlHandlers.onCc) {
    controlHandlers.onCc(parsed.controlCc);
  }

  pushDebugLog({
    direction: "in",
    kind: parsed.debug.kind,
    summary: parsed.debug.summary,
    payload: asMidiPayload(parsed.debug.bytes),
    portName: connectedInput?.name ?? null,
  });
}

function disconnectInput() {
  if (connectedInput) {
    connectedInput.onmidimessage = null;
    connectedInput = null;
  }
}

export function setWebMidiControlHandlers(handlers: typeof controlHandlers) {
  controlHandlers = handlers;
}

export async function listWebMidiInputs(): Promise<string[]> {
  const access = await ensureMidiAccess();
  return [...access.inputs.values()].map((port) => port.name ?? "Unknown");
}

export async function listWebMidiOutputs(): Promise<string[]> {
  const access = await ensureMidiAccess();
  return [...access.outputs.values()].map((port) => port.name ?? "Unknown");
}

export async function startWebMidiInput(portName: string | null): Promise<void> {
  disconnectInput();

  if (!portName?.trim()) {
    return;
  }

  const access = await ensureMidiAccess();
  const input = findInputPort(access, portName.trim());
  if (!input) {
    throw new Error(`MIDI input port not found: ${portName}`);
  }

  input.onmidimessage = handleIncomingMidi;
  connectedInput = input;
}

export async function stopWebMidiInput(): Promise<void> {
  disconnectInput();
}

export async function sendWebMidiRaw(portName: string, bytes: number[]): Promise<void> {
  const access = await ensureMidiAccess();
  const output = findOutputPort(access, portName);
  if (!output) {
    throw new Error(`MIDI output port not found: ${portName}`);
  }

  output.send(bytes);
}
