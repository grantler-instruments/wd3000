import { describe, expect, it } from "vitest";
import { createControl, defaultPerformerIoConfig } from "../types";
import { routeMidiCcMessage, routeMidiNoteMessage, routeOscMessage } from "./inputRouter";

function withOsc(control: ReturnType<typeof createControl>, address: string, enabled = true) {
  return {
    ...control,
    osc: { ...control.osc, enabled, address },
    midi: { ...control.midi, enabled: false },
    mqtt: { ...control.mqtt, enabled: false },
  };
}

function withMidi(
  control: ReturnType<typeof createControl>,
  patch: Partial<ReturnType<typeof createControl>["midi"]> & { enabled?: boolean },
) {
  return {
    ...control,
    osc: { ...control.osc, enabled: false },
    mqtt: { ...control.mqtt, enabled: false },
    midi: { ...control.midi, enabled: true, ...patch },
  };
}

describe("routeOscMessage", () => {
  it("maps normalized OSC floats to 0–100 for sliders", () => {
    const slider = withOsc(createControl("slider", 1, 0), "/slider/1");
    expect(routeOscMessage([slider], { address: "/slider/1", value: 0.5 })).toEqual([
      { controlId: slider.id, value: 50 },
    ]);
  });

  it("treats button/switch values as on/off at 0.5 threshold", () => {
    const button = withOsc(createControl("button", 1, 0), "/button/1");
    expect(routeOscMessage([button], { address: "/button/1", value: 0.49 })).toEqual([
      { controlId: button.id, value: 0 },
    ]);
    expect(routeOscMessage([button], { address: "/button/1", value: 0.5 })).toEqual([
      { controlId: button.id, value: 100 },
    ]);
  });

  it("routes pad axis addresses", () => {
    const pad = withOsc(createControl("pad", 1, 0), "/pad/1");
    expect(routeOscMessage([pad], { address: "/pad/1/x", value: 0.25 })).toEqual([
      { controlId: pad.id, axis: "x", value: 25 },
    ]);
    expect(routeOscMessage([pad], { address: "/pad/1/y", value: 1 })).toEqual([
      { controlId: pad.id, axis: "y", value: 100 },
    ]);
  });

  it("maps OSC values onto tab indices", () => {
    const tabs = withOsc(createControl("tabs", 1, 0), "/tabs/1");
    expect(routeOscMessage([tabs], { address: "/tabs/1", value: 0 })).toEqual([
      { controlId: tabs.id, tabIndex: 0 },
    ]);
    expect(routeOscMessage([tabs], { address: "/tabs/1", value: 1 })).toEqual([
      { controlId: tabs.id, tabIndex: 1 },
    ]);
  });

  it("ignores disabled or unmatched OSC mappings", () => {
    const slider = withOsc(createControl("slider", 1, 0), "/slider/1", false);
    expect(routeOscMessage([slider], { address: "/slider/1", value: 1 })).toEqual([]);
    expect(
      routeOscMessage([withOsc(createControl("slider", 2, 1), "/other")], {
        address: "/slider/1",
        value: 1,
      }),
    ).toEqual([]);
  });
});

describe("routeMidiNoteMessage", () => {
  it("toggles buttons from note velocity", () => {
    const button = withMidi(createControl("button", 1, 0), { channel: 1, note: 60 });
    expect(routeMidiNoteMessage([button], { channel: 1, note: 60, velocity: 100 })).toEqual([
      { controlId: button.id, value: 100 },
    ]);
    expect(routeMidiNoteMessage([button], { channel: 1, note: 60, velocity: 0 })).toEqual([
      { controlId: button.id, value: 0 },
    ]);
  });

  it("activates keyboard notes in range", () => {
    const keyboard = withMidi(createControl("keyboard", 1, 0), {
      channel: 2,
      note: 48,
      octaves: 2,
    });
    expect(routeMidiNoteMessage([keyboard], { channel: 2, note: 60, velocity: 90 })).toEqual([
      { controlId: keyboard.id, note: 60, active: true },
    ]);
    expect(routeMidiNoteMessage([keyboard], { channel: 2, note: 80, velocity: 90 })).toEqual([]);
  });

  it("requires matching channel", () => {
    const button = withMidi(createControl("button", 1, 0), { channel: 1, note: 60 });
    expect(routeMidiNoteMessage([button], { channel: 2, note: 60, velocity: 100 })).toEqual([]);
  });
});

describe("routeMidiCcMessage", () => {
  it("maps CC 0–127 onto slider values 0–100", () => {
    const slider = withMidi(createControl("slider", 1, 0), { channel: 1, cc: 10 });
    expect(routeMidiCcMessage([slider], { channel: 1, cc: 10, value: 64 })).toEqual([
      { controlId: slider.id, value: 50 },
    ]);
  });

  it("routes pad X/Y CCs onto axes", () => {
    const pad = withMidi(createControl("pad", 1, 0), { channel: 1, cc: 20, ccY: 21 });
    expect(routeMidiCcMessage([pad], { channel: 1, cc: 20, value: 0 })).toEqual([
      { controlId: pad.id, axis: "x", value: 0 },
    ]);
    expect(routeMidiCcMessage([pad], { channel: 1, cc: 21, value: 127 })).toEqual([
      { controlId: pad.id, axis: "y", value: 100 },
    ]);
  });

  it("maps CC values onto tab indices", () => {
    const tabs = withMidi(createControl("tabs", 1, 0), { channel: 1, cc: 30 });
    expect(routeMidiCcMessage([tabs], { channel: 1, cc: 30, value: 0 })).toEqual([
      { controlId: tabs.id, tabIndex: 0 },
    ]);
    expect(routeMidiCcMessage([tabs], { channel: 1, cc: 30, value: 127 })).toEqual([
      { controlId: tabs.id, tabIndex: 1 },
    ]);
  });
});

describe("createControl baseline for routing fixtures", () => {
  it("builds controls with performer IO assignments available", () => {
    const io = defaultPerformerIoConfig();
    const control = createControl("slider", 1, 0, io);
    expect(control.oscSenderId).toBe(io.oscSenders[0]?.id);
  });
});
