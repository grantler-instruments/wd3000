import { describe, expect, it } from "vitest";
import {
  CONFIG_APP_ID,
  CONFIG_EXPORT_VERSION,
  createConfigExport,
  parseConfigImport,
  serializeConfigExport,
} from "./config";
import {
  createControl,
  defaultLayoutSettings,
  defaultOutputConfig,
  defaultPerformerIoConfig,
} from "../types";

function sampleConfig() {
  return {
    controls: [createControl("button", 0, 0)],
    output: defaultOutputConfig(),
    performerIo: defaultPerformerIoConfig(),
    layoutSettings: defaultLayoutSettings(),
  };
}

describe("createConfigExport", () => {
  it("wraps config with app metadata", () => {
    const exported = createConfigExport(sampleConfig());

    expect(exported.version).toBe(CONFIG_EXPORT_VERSION);
    expect(exported.app).toBe(CONFIG_APP_ID);
    expect(exported.config.controls).toHaveLength(1);
    expect(exported.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("serializeConfigExport", () => {
  it("returns pretty-printed JSON with a trailing newline", () => {
    const serialized = serializeConfigExport(sampleConfig());
    expect(serialized.endsWith("\n")).toBe(true);
    expect(JSON.parse(serialized).app).toBe(CONFIG_APP_ID);
  });
});

describe("parseConfigImport", () => {
  it("accepts wrapped export files", () => {
    const wrapped = createConfigExport(sampleConfig());
    const parsed = parseConfigImport(JSON.stringify(wrapped));

    expect(parsed.controls).toHaveLength(1);
    expect(parsed.controls[0]?.type).toBe("button");
  });

  it("accepts legacy bare config objects", () => {
    const parsed = parseConfigImport(JSON.stringify(sampleConfig()));
    expect(parsed.controls).toHaveLength(1);
  });

  it("rejects files from other apps", () => {
    const foreign = {
      app: "other-app",
      config: sampleConfig(),
    };

    expect(() => parseConfigImport(JSON.stringify(foreign))).toThrow(
      "This file is not a WD3000 config.",
    );
  });

  it("rejects invalid JSON", () => {
    expect(() => parseConfigImport("{not json")).toThrow("File is not valid JSON.");
  });
});
