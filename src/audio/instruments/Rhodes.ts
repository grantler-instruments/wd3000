import { type ElemNode, el } from "@elemaudio/core";
import { midiToFreq } from "../midiToFreq";
import {
  createConstRef,
  createGateRef,
  createParamRef,
  type ElemCore,
  type ParamRef,
} from "../paramRefs";

/** Per-voice gain so polyphonic sums stay below clipping before bus saturation. */
const VOICE_MIX_GAIN = 0.4;
const VOICE_COUNT = 8;

export type RhodesParams = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  bell: number;
  bellRatio: number;
  filterCutoff: number;
  filterEnv: number;
  tremoloRate: number;
  tremoloDepth: number;
  drive: number;
};

export const DEFAULT_RHODES_PARAMS: RhodesParams = {
  attack: 0.002,
  decay: 1.4,
  sustain: 0.42,
  release: 0.9,
  bell: 65,
  bellRatio: 3.2,
  filterCutoff: 2800,
  filterEnv: 0.35,
  tremoloRate: 4.5,
  tremoloDepth: 0.18,
  drive: 1.15,
};

type Voice = {
  gate: number;
  note: number;
  key: string;
  gateNode: unknown;
  setGate: ParamRef["setValue"];
  freqNode: unknown;
  setFreq: ParamRef["setValue"];
  velNode: unknown;
  setVelocity: ParamRef["setValue"];
};

/**
 * FM-style electric piano voice ported from grantler-instruments/BYODMCSE.
 */
export class Rhodes {
  readonly id: string;
  private voices: Voice[];
  private nextVoice = 0;

  private attackRef: ParamRef;
  private decayRef: ParamRef;
  private sustainRef: ParamRef;
  private releaseRef: ParamRef;
  private bellRef: ParamRef;
  private bellRatioRef: ParamRef;
  private filterCutoffRef: ParamRef;
  private filterEnvRef: ParamRef;
  private tremoloRateRef: ParamRef;
  private tremoloDepthRef: ParamRef;
  private driveRef: ParamRef;

  constructor(id: string, core: ElemCore, parameters: Partial<RhodesParams> = {}) {
    this.id = id;
    const params = { ...DEFAULT_RHODES_PARAMS, ...parameters };

    this.attackRef = createParamRef(core, `${id}-attack`, params.attack);
    this.decayRef = createParamRef(core, `${id}-decay`, params.decay);
    this.sustainRef = createParamRef(core, `${id}-sustain`, params.sustain);
    this.releaseRef = createParamRef(core, `${id}-release`, params.release);
    this.bellRef = createParamRef(core, `${id}-bell`, params.bell);
    this.bellRatioRef = createParamRef(core, `${id}-bellRatio`, params.bellRatio);
    this.filterCutoffRef = createParamRef(core, `${id}-filterCutoff`, params.filterCutoff);
    this.filterEnvRef = createParamRef(core, `${id}-filterEnv`, params.filterEnv);
    this.tremoloRateRef = createParamRef(core, `${id}-tremoloRate`, params.tremoloRate);
    this.tremoloDepthRef = createParamRef(core, `${id}-tremoloDepth`, params.tremoloDepth);
    this.driveRef = createParamRef(core, `${id}-drive`, params.drive);

    this.voices = Array.from({ length: VOICE_COUNT }, (_, index) => {
      const key = `${id}-v${index}`;
      const gate = createGateRef(core, key);
      const freq = createConstRef(core, `frequency-${key}`, 0);
      const velocity = createConstRef(core, `velocity-${key}`, 0);

      return {
        gate: 0,
        note: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
        freqNode: freq.node,
        setFreq: freq.setValue,
        velNode: velocity.node,
        setVelocity: velocity.setValue,
      };
    });
  }

  async setParams(partial: Partial<RhodesParams>): Promise<void> {
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
    if (partial.bell !== undefined) {
      await this.bellRef.setValue({ value: partial.bell });
    }
    if (partial.bellRatio !== undefined) {
      await this.bellRatioRef.setValue({ value: partial.bellRatio });
    }
    if (partial.filterCutoff !== undefined) {
      await this.filterCutoffRef.setValue({ value: partial.filterCutoff });
    }
    if (partial.filterEnv !== undefined) {
      await this.filterEnvRef.setValue({ value: partial.filterEnv });
    }
    if (partial.tremoloRate !== undefined) {
      await this.tremoloRateRef.setValue({ value: partial.tremoloRate });
    }
    if (partial.tremoloDepth !== undefined) {
      await this.tremoloDepthRef.setValue({ value: partial.tremoloDepth });
    }
    if (partial.drive !== undefined) {
      await this.driveRef.setValue({ value: partial.drive });
    }
  }

  private voice(voice: Voice): ElemNode {
    const ampEnv = el.adsr(
      { key: `rhodes-amp-${voice.key}` },
      this.attackRef.node as ElemNode,
      this.decayRef.node as ElemNode,
      this.sustainRef.node as ElemNode,
      this.releaseRef.node as ElemNode,
      voice.gateNode as ElemNode,
    );

    const bellEnv = el.adsr(
      { key: `rhodes-bell-${voice.key}` },
      0.001,
      0.06,
      0,
      0.08,
      voice.gateNode as ElemNode,
    );

    const filterEnv = el.adsr(
      { key: `rhodes-filter-${voice.key}` },
      0.008,
      0.5,
      0.15,
      0.45,
      voice.gateNode as ElemNode,
    );

    const bellDepth = el.mul(
      this.bellRef.node as ElemNode,
      el.const({ key: `rhodes-bell-scale-${voice.key}`, value: 0.1 }),
    );

    const modOsc = el.mul(
      bellEnv,
      el.mul(
        bellDepth,
        el.cycle(
          { key: `rhodes-mod-${voice.key}` },
          el.mul(voice.freqNode as ElemNode, this.bellRatioRef.node as ElemNode),
        ),
      ),
    );

    const fundamental = el.cycle({ key: `rhodes-fund-${voice.key}` }, voice.freqNode as ElemNode);

    const tine = el.cycle(
      { key: `rhodes-carrier-${voice.key}` },
      el.add(voice.freqNode as ElemNode, modOsc),
    );

    const body = el.mul(
      el.const({ key: `rhodes-body-level-${voice.key}`, value: 0.38 }),
      el.cycle(
        { key: `rhodes-body-${voice.key}` },
        el.mul(
          voice.freqNode as ElemNode,
          el.const({ key: `rhodes-body-ratio-${voice.key}`, value: 2 }),
        ),
      ),
    );

    const tone = el.add(
      el.mul(el.const({ key: `rhodes-fund-level-${voice.key}`, value: 0.62 }), fundamental),
      el.mul(el.const({ key: `rhodes-tine-level-${voice.key}`, value: 0.28 }), tine),
      body,
    );

    const raw = el.mul(ampEnv, tone);

    const cutoff = el.add(
      this.filterCutoffRef.node as ElemNode,
      el.mul(
        filterEnv,
        el.mul(this.filterEnvRef.node as ElemNode, this.filterCutoffRef.node as ElemNode),
      ),
    );

    const filtered = el.lowpass(cutoff, 0.55, raw);

    const lfo = el.cycle({ key: `rhodes-lfo-${voice.key}` }, this.tremoloRateRef.node as ElemNode);
    const halfDepth = el.mul(
      el.const({ key: `rhodes-trem-half-${voice.key}`, value: 0.5 }),
      this.tremoloDepthRef.node as ElemNode,
    );
    const trem = el.add(
      el.sub(el.const({ key: `rhodes-trem-one-${voice.key}`, value: 1 }), halfDepth),
      el.mul(
        halfDepth,
        el.add(el.const({ key: `rhodes-trem-lfo-offset-${voice.key}`, value: 1 }), lfo),
      ),
    );

    const driven = el.tanh(
      el.mul(filtered, trem, voice.velNode as ElemNode, this.driveRef.node as ElemNode),
    );

    return el.mul(
      el.const({ key: `rhodes-voice-mix-${voice.key}`, value: VOICE_MIX_GAIN }),
      driven,
    );
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

    if (retrigger) {
      voice.gate = 0;
      await voice.setGate({ value: 0 });
    }

    await voice.setFreq({ value: midiToFreq(note) });
    await voice.setVelocity({ value: normalizedVelocity });
    voice.note = note;
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
    return el.tanh(el.add(...this.voices.map((v) => this.voice(v))));
  }
}
