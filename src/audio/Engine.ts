import { type ElemNode, el } from "@elemaudio/core";
import { DEFAULT_RHODES_PARAMS, Rhodes, type RhodesParams } from "./instruments/Rhodes";
import { DEFAULT_SYNTH_PARAMS, Synth, type SynthParams } from "./instruments/Synth";
import type { InstrumentType } from "./instruments/types";
import { createParamRef, type ElemCore, type ParamRef } from "./paramRefs";

type VoiceInstrument = {
  noteOn: (note: number, velocity: number) => void;
  noteOff: (note: number) => void;
  allNotesOff: () => void;
  render: () => ElemNode;
};

export class Engine {
  private readonly core: ElemCore;
  private instrument: VoiceInstrument;
  private instrumentType: InstrumentType;
  private readonly masterGainRef: ParamRef;
  private readonly onRequestRender?: () => void;
  /** 0 = omni, otherwise 1–16 */
  midiChannel: number;
  private synthParams: SynthParams;
  private rhodesParams: RhodesParams;

  constructor(
    core: ElemCore,
    options: {
      instrument?: InstrumentType;
      midiChannel?: number;
      masterGain?: number;
      synthParams?: Partial<SynthParams>;
      rhodesParams?: Partial<RhodesParams>;
      onRequestRender?: () => void;
    } = {},
  ) {
    this.core = core;
    this.midiChannel = options.midiChannel ?? 0;
    this.onRequestRender = options.onRequestRender;
    this.masterGainRef = createParamRef(core, "master-gain", options.masterGain ?? 0.8);
    this.synthParams = { ...DEFAULT_SYNTH_PARAMS, ...options.synthParams };
    this.rhodesParams = { ...DEFAULT_RHODES_PARAMS, ...options.rhodesParams };
    this.instrumentType = options.instrument ?? "synth";
    this.instrument = this.createInstrument(this.instrumentType);
  }

  private createInstrument(type: InstrumentType): VoiceInstrument {
    if (type === "rhodes") {
      return new Rhodes("rhodes", this.core, this.rhodesParams);
    }
    return new Synth("synth", this.core, this.synthParams);
  }

  noteOn(channel: number, note: number, velocity: number): void {
    if (this.midiChannel !== 0 && channel !== this.midiChannel) {
      return;
    }
    this.instrument.noteOn(note, velocity);
  }

  noteOff(channel: number, note: number): void {
    if (this.midiChannel !== 0 && channel !== this.midiChannel) {
      return;
    }
    this.instrument.noteOff(note);
  }

  allNotesOff(): void {
    this.instrument.allNotesOff();
  }

  async setMasterGain(gain: number): Promise<void> {
    await this.masterGainRef.setValue({ value: Math.min(1, Math.max(0, gain)) });
  }

  async setSynthParams(partial: Partial<SynthParams>): Promise<void> {
    this.synthParams = { ...this.synthParams, ...partial };
    if (this.instrument instanceof Synth) {
      await this.instrument.setParams(partial, this.onRequestRender);
    }
  }

  async setRhodesParams(partial: Partial<RhodesParams>): Promise<void> {
    this.rhodesParams = { ...this.rhodesParams, ...partial };
    if (this.instrument instanceof Rhodes) {
      await this.instrument.setParams(partial);
    }
  }

  setInstrument(type: InstrumentType): boolean {
    if (type === this.instrumentType) {
      return false;
    }
    this.instrument.allNotesOff();
    this.instrumentType = type;
    this.instrument = this.createInstrument(type);
    return true;
  }

  getInstrumentType(): InstrumentType {
    return this.instrumentType;
  }

  setMidiChannel(channel: number): void {
    this.midiChannel = channel;
  }

  render(): ElemNode {
    const signal = this.instrument.render();
    const mastered = el.mul(signal, this.masterGainRef.node as ElemNode);
    return el.tanh(el.mul(mastered, 0.6));
  }
}
