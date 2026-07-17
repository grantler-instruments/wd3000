import i18n from "../i18n";

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
      return i18n.t("midiKinds.note");
    case "midi-cc":
      return i18n.t("midiKinds.cc");
    case "midi-pc":
      return i18n.t("midiKinds.pc");
    case "midi-pitch-bend":
      return i18n.t("midiKinds.pitch");
    case "midi-pressure":
      return i18n.t("midiKinds.pressure");
    case "midi-poly-pressure":
      return i18n.t("midiKinds.polyAt");
    case "midi-mtc":
      return i18n.t("midiKinds.mtc");
    case "midi-song-position":
      return i18n.t("midiKinds.songPos");
    case "midi-song-select":
      return i18n.t("midiKinds.songSel");
    case "midi-tune-request":
      return i18n.t("midiKinds.tune");
    case "midi-sysex":
      return i18n.t("midiKinds.sysex");
    case "midi-sysex-end":
      return i18n.t("midiKinds.eox");
    case "midi-timing-clock":
      return i18n.t("midiKinds.clock");
    case "midi-start":
      return i18n.t("midiKinds.start");
    case "midi-continue":
      return i18n.t("midiKinds.continue");
    case "midi-stop":
      return i18n.t("midiKinds.stop");
    case "midi-active-sensing":
      return i18n.t("midiKinds.sense");
    case "midi-system-reset":
      return i18n.t("midiKinds.reset");
    case "midi-raw":
      return i18n.t("midiKinds.raw");
    default:
      return kind;
  }
}

export function midiComposerTypeLabel(type: MidiComposerType) {
  switch (type) {
    case "note-on":
      return i18n.t("midiComposer.noteOn");
    case "note-off":
      return i18n.t("midiComposer.noteOff");
    case "cc":
      return i18n.t("midiComposer.controlChange");
    case "program-change":
      return i18n.t("midiComposer.programChange");
    case "pitch-bend":
      return i18n.t("midiComposer.pitchBend");
    case "channel-pressure":
      return i18n.t("midiComposer.aftertouch");
    case "poly-pressure":
      return i18n.t("midiComposer.polyAftertouch");
    case "sysex":
      return i18n.t("midiComposer.sysex");
    case "start":
      return i18n.t("midiKinds.start");
    case "stop":
      return i18n.t("midiKinds.stop");
    case "continue":
      return i18n.t("midiKinds.continue");
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
