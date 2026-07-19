import { describe, expect, it } from "vitest";
import { formatWsBrokerUrl } from "./webMqtt";

describe("formatWsBrokerUrl", () => {
  it("formats host and port as a trailing-slash ws URL", () => {
    expect(formatWsBrokerUrl("localhost", 9001)).toBe("ws://localhost:9001/");
  });

  it("brackets IPv6 hosts", () => {
    expect(formatWsBrokerUrl("::1", 9001)).toBe("ws://[::1]:9001/");
  });

  it("preserves a full URL and adds a trailing slash", () => {
    expect(formatWsBrokerUrl("ws://broker.example:9001", 1)).toBe("ws://broker.example:9001/");
  });
});
