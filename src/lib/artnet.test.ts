import { describe, expect, it } from "vitest";
import {
  ARTNET_MAX_CHANNEL,
  ARTNET_MAX_VALUE,
  ARTNET_MIN_CHANNEL,
  ARTNET_MIN_VALUE,
  buildArtNetChannels,
  formatArtNetComposerSummary,
  formatArtNetSummary,
} from "./artnet";

describe("buildArtNetChannels", () => {
  it("places the value at the requested 1-based channel", () => {
    expect(buildArtNetChannels(1, 255)).toEqual([255]);
    expect(buildArtNetChannels(3, 42)).toEqual([0, 0, 42]);
  });

  it("clamps channel and value to Art-Net limits", () => {
    const channels = buildArtNetChannels(999, 300);
    expect(channels).toHaveLength(ARTNET_MAX_CHANNEL);
    expect(channels[ARTNET_MAX_CHANNEL - 1]).toBe(ARTNET_MAX_VALUE);
  });

  it("clamps low channel and value", () => {
    const channels = buildArtNetChannels(ARTNET_MIN_CHANNEL - 5, -10);
    expect(channels).toHaveLength(1);
    expect(channels[0]).toBe(ARTNET_MIN_VALUE);
  });
});

describe("formatArtNetComposerSummary", () => {
  it("includes universe, channel, value, and sequence", () => {
    expect(
      formatArtNetComposerSummary({ universe: 2, channel: 10, value: 128 }, 7),
    ).toBe("Universe 2 ch 10 = 128 (seq 7)");
  });
});

describe("formatArtNetSummary", () => {
  it("summarizes non-zero channels", () => {
    expect(
      formatArtNetSummary({
        universe: 0,
        sequence: 1,
        physical: 0,
        channels: [0, 0, 100, 50],
      }),
    ).toContain("ch3=100");
  });

  it("reports all zero when every channel is off", () => {
    expect(
      formatArtNetSummary({
        universe: 0,
        sequence: 1,
        channels: [0, 0, 0],
      }),
    ).toContain("all zero");
  });
});
