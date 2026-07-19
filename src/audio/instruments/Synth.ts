import { type ElemNode, el } from "@elemaudio/core";
import { midiToFreq } from "../midiToFreq";
import {
  createConstRef,
  createGateRef,
  createParamRef,
  type ElemCore,
  type ParamRef,
} from "../paramRefs";

export type Waveform = "sine" | "saw" | "square" | "triangle";

export type SynthParams = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  amplitudeA: number;
  amplitudeB: number;
  amplitudeC: number;
  detuneA: number;
  detuneB: number;
  detuneC: number;
  waveformA: Waveform;
  waveformB: Waveform;
  waveformC: Waveform;
};

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  attack: 0.01,
  decay: 0.2,
  sustain: 0.7,
  release: 0.4,
  amplitudeA: 0.45,
  amplitudeB: 0.25,
  amplitudeC: 0.15,
  detuneA: 1,
  detuneB: 1.003,
  detuneC: 0.997,
  waveformA: "saw",
  waveformB: "square",
  waveformC: "sine",
};

type Voice = {
  gate: number;
  note: number;
  key: string;
  gateNode: unknown;
  setGate: ParamRef["setValue"];
  freqNodeA: unknown;
  setFreqA: ParamRef["setValue"];
  freqNodeB: unknown;
  setFreqB: ParamRef["setValue"];
  freqNodeC: unknown;
  setFreqC: ParamRef["setValue"];
  velNode: unknown;
  setVelocity: ParamRef["setValue"];
};

const VOICE_COUNT = 8;

export class Synth {
  readonly id: string;
  private voices: Voice[];
  private nextVoice = 0;

  private attackRef: ParamRef;
  private decayRef: ParamRef;
  private sustainRef: ParamRef;
  private releaseRef: ParamRef;
  private amplitudeARef: ParamRef;
  private amplitudeBRef: ParamRef;
  private amplitudeCRef: ParamRef;

  private detuneA: number;
  private detuneB: number;
  private detuneC: number;
  private waveformA: Waveform;
  private waveformB: Waveform;
  private waveformC: Waveform;

  constructor(id: string, core: ElemCore, parameters: Partial<SynthParams> = {}) {
    this.id = id;
    const params = { ...DEFAULT_SYNTH_PARAMS, ...parameters };

    this.detuneA = params.detuneA;
    this.detuneB = params.detuneB;
    this.detuneC = params.detuneC;
    this.waveformA = params.waveformA;
    this.waveformB = params.waveformB;
    this.waveformC = params.waveformC;

    this.attackRef = createParamRef(core, `${id}-attack`, params.attack);
    this.decayRef = createParamRef(core, `${id}-decay`, params.decay);
    this.sustainRef = createParamRef(core, `${id}-sustain`, params.sustain);
    this.releaseRef = createParamRef(core, `${id}-release`, params.release);
    this.amplitudeARef = createParamRef(core, `${id}-amplitudeA`, params.amplitudeA);
    this.amplitudeBRef = createParamRef(core, `${id}-amplitudeB`, params.amplitudeB);
    this.amplitudeCRef = createParamRef(core, `${id}-amplitudeC`, params.amplitudeC);

    this.voices = Array.from({ length: VOICE_COUNT }, (_, index) => {
      const key = `${id}-v${index}`;
      const gate = createGateRef(core, key);
      const freqA = createConstRef(core, `frequencyA-${key}`, 0);
      const freqB = createConstRef(core, `frequencyB-${key}`, 0);
      const freqC = createConstRef(core, `frequencyC-${key}`, 0);
      const velocity = createConstRef(core, `velocity-${key}`, 0);

      return {
        gate: 0,
        note: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
        freqNodeA: freqA.node,
        setFreqA: freqA.setValue,
        freqNodeB: freqB.node,
        setFreqB: freqB.setValue,
        freqNodeC: freqC.node,
        setFreqC: freqC.setValue,
        velNode: velocity.node,
        setVelocity: velocity.setValue,
      };
    });
  }

  async setParams(partial: Partial<SynthParams>, requestRender?: () => void): Promise<void> {
    if (partial.attack !== undefined) {
      await this.attackRef.setValue({ value: partial.attack });
    }
    if (partial.decay !== undefined) {
      await this.decayRef.setValue({ value: partial.decay });
    }
    if (partial.sustain !== undefined) {
      await this.sustainRef.setValue({ value: partial.sustain });
    }
    if (partial.release !== undefined) {
      await this.releaseRef.setValue({ value: partial.release });
    }
    if (partial.amplitudeA !== undefined) {
      await this.amplitudeARef.setValue({ value: partial.amplitudeA });
    }
    if (partial.amplitudeB !== undefined) {
      await this.amplitudeBRef.setValue({ value: partial.amplitudeB });
    }
    if (partial.amplitudeC !== undefined) {
      await this.amplitudeCRef.setValue({ value: partial.amplitudeC });
    }
    if (partial.detuneA !== undefined) {
      this.detuneA = partial.detuneA;
    }
    if (partial.detuneB !== undefined) {
      this.detuneB = partial.detuneB;
    }
    if (partial.detuneC !== undefined) {
      this.detuneC = partial.detuneC;
    }

    let needsRender = false;
    if (partial.waveformA !== undefined) {
      this.waveformA = partial.waveformA;
      needsRender = true;
    }
    if (partial.waveformB !== undefined) {
      this.waveformB = partial.waveformB;
      needsRender = true;
    }
    if (partial.waveformC !== undefined) {
      this.waveformC = partial.waveformC;
      needsRender = true;
    }
    if (needsRender) {
      requestRender?.();
    }
  }

  private getWaveform(waveform: Waveform, frequency: unknown, key: string): ElemNode {
    switch (waveform) {
      case "saw":
        return el.saw({ key }, frequency as ElemNode);
      case "square":
        return el.square({ key }, frequency as ElemNode);
      case "triangle":
        return el.triangle({ key }, frequency as ElemNode);
      default:
        return el.cycle({ key }, frequency as ElemNode);
    }
  }

  private voice(voice: Voice): ElemNode {
    const env = el.adsr(
      { key: `env-${voice.key}` },
      this.attackRef.node as ElemNode,
      this.decayRef.node as ElemNode,
      this.sustainRef.node as ElemNode,
      this.releaseRef.node as ElemNode,
      voice.gateNode as ElemNode,
    );

    const oscA = el.mul(
      this.amplitudeARef.node as ElemNode,
      this.getWaveform(this.waveformA, voice.freqNodeA, `oscA-${voice.key}`),
    );
    const oscB = el.mul(
      this.amplitudeBRef.node as ElemNode,
      this.getWaveform(this.waveformB, voice.freqNodeB, `oscB-${voice.key}`),
    );
    const oscC = el.mul(
      this.amplitudeCRef.node as ElemNode,
      this.getWaveform(this.waveformC, voice.freqNodeC, `oscC-${voice.key}`),
    );

    return el.mul(env, el.add(oscA, oscB, oscC), voice.velNode as ElemNode);
  }

  noteOn(note: number, velocity: number): void {
    void this.handleNoteOn(note, velocity);
  }

  noteOff(note: number): void {
    void this.handleNoteOff(note);
  }

  private async handleNoteOn(note: number, velocity: number): Promise<void> {
    const normalizedVelocity = Math.min(1, Math.max(0, velocity / 127));
    const existing = this.voices.find((v) => v.note === note);
    const voice = existing ?? this.voices[this.nextVoice];
    const retrigger = voice.gate === 1;

    this.nextVoice = (this.nextVoice + 1) % this.voices.length;

    const freq = midiToFreq(note);
    await voice.setFreqA({ value: freq * this.detuneA });
    await voice.setFreqB({ value: freq * this.detuneB });
    await voice.setFreqC({ value: freq * this.detuneC });
    await voice.setVelocity({ value: normalizedVelocity });
    voice.note = note;

    if (retrigger) {
      await voice.setGate({ value: 0 });
      voice.gate = 0;
    }
    await voice.setGate({ value: 1 });
    voice.gate = 1;
  }

  private async handleNoteOff(note: number): Promise<void> {
    const voice = this.voices.find((v) => v.note === note);
    if (!voice) {
      return;
    }
    voice.gate = 0;
    await voice.setGate({ value: 0 });
  }

  allNotesOff(): void {
    for (const voice of this.voices) {
      voice.gate = 0;
      voice.note = 0;
      void voice.setGate({ value: 0 });
    }
  }

  render(): ElemNode {
    return el.add(...this.voices.map((v) => this.voice(v)));
  }
}
