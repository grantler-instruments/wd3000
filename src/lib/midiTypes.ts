export type MidiComposerType =
  | "note-on"
  | "note-off"
  | "cc"
  | "program-change"
  | "pitch-bend"
  | "channel-pressure"
  | "poly-pressure"
  | "sysex"
  | "start"
  | "stop"
  | "continue";

export type MidiDebugKind =
  | "midi-note"
  | "midi-cc"
  | "midi-pc"
  | "midi-pitch-bend"
  | "midi-pressure"
  | "midi-poly-pressure"
  | "midi-mtc"
  | "midi-song-position"
  | "midi-song-select"
  | "midi-tune-request"
  | "midi-sysex"
  | "midi-sysex-end"
  | "midi-timing-clock"
  | "midi-start"
  | "midi-continue"
  | "midi-stop"
  | "midi-active-sensing"
  | "midi-system-reset"
  | "midi-raw";

export const MIDI_STATUS = {
  NOTE_OFF: 0x80,
  NOTE_ON: 0x90,
  POLY_PRESSURE: 0xa0,
  CONTROL_CHANGE: 0xb0,
  PROGRAM_CHANGE: 0xc0,
  CHANNEL_PRESSURE: 0xd0,
  PITCH_BEND: 0xe0,
  SYSEX_START: 0xf0,
  START: 0xfa,
  STOP: 0xfc,
  CONTINUE: 0xfb,
} as const;

export const MIDI_COMPOSER_TYPES: MidiComposerType[] = [
  "note-on",
  "note-off",
  "cc",
  "program-change",
  "pitch-bend",
  "channel-pressure",
  "poly-pressure",
  "sysex",
  "start",
  "stop",
  "continue",
];

export function isMidiDebugKind(kind: string): kind is MidiDebugKind {
  return kind.startsWith("midi-");
}

export function midiComposerRequiresChannel(type: MidiComposerType) {
  return type !== "sysex" && type !== "start" && type !== "stop" && type !== "continue";
}

export function midiKindLabel(kind: string) {
  switch (kind) {
    case "midi-note":
      return "Note";
    case "midi-cc":
      return "CC";
    case "midi-pc":
      return "PC";
    case "midi-pitch-bend":
      return "Pitch";
    case "midi-pressure":
      return "Pressure";
    case "midi-poly-pressure":
      return "Poly AT";
    case "midi-mtc":
      return "MTC";
    case "midi-song-position":
      return "Song Pos";
    case "midi-song-select":
      return "Song Sel";
    case "midi-tune-request":
      return "Tune";
    case "midi-sysex":
      return "SysEx";
    case "midi-sysex-end":
      return "EOX";
    case "midi-timing-clock":
      return "Clock";
    case "midi-start":
      return "Start";
    case "midi-continue":
      return "Continue";
    case "midi-stop":
      return "Stop";
    case "midi-active-sensing":
      return "Sense";
    case "midi-system-reset":
      return "Reset";
    case "midi-raw":
      return "Raw";
    default:
      return kind;
  }
}

export function midiComposerTypeLabel(type: MidiComposerType) {
  switch (type) {
    case "note-on":
      return "Note On";
    case "note-off":
      return "Note Off";
    case "cc":
      return "Control Change";
    case "program-change":
      return "Program Change";
    case "pitch-bend":
      return "Pitch Bend";
    case "channel-pressure":
      return "Aftertouch";
    case "poly-pressure":
      return "Polyphonic Aftertouch";
    case "sysex":
      return "SysEx";
    case "start":
      return "Start";
    case "stop":
      return "Stop";
    case "continue":
      return "Continue";
  }
}

export function midiComposerDebugKind(type: MidiComposerType): MidiDebugKind {
  switch (type) {
    case "note-on":
    case "note-off":
      return "midi-note";
    case "cc":
      return "midi-cc";
    case "program-change":
      return "midi-pc";
    case "pitch-bend":
      return "midi-pitch-bend";
    case "channel-pressure":
      return "midi-pressure";
    case "poly-pressure":
      return "midi-poly-pressure";
    case "sysex":
      return "midi-sysex";
    case "start":
      return "midi-start";
    case "stop":
      return "midi-stop";
    case "continue":
      return "midi-continue";
  }
}
