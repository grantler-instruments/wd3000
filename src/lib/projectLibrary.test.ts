import { describe, expect, it } from "vitest";
import {
  createControl,
  defaultLayoutSettings,
  defaultOutputConfig,
  defaultPerformerIoConfig,
} from "../types";
import {
  createSavedProject,
  findProjectByName,
  normalizeProjectName,
  sanitizeSavedProject,
  sanitizeSavedProjects,
} from "./projectLibrary";

function sampleConfig() {
  return {
    controls: [createControl("button", 0, 0)],
    output: defaultOutputConfig(),
    performerIo: defaultPerformerIoConfig(),
    layoutSettings: defaultLayoutSettings(),
  };
}

describe("normalizeProjectName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeProjectName("  My   Layout  ")).toBe("My Layout");
  });
});

describe("createSavedProject", () => {
  it("creates a named project entry", () => {
    const project = createSavedProject("  Stage A  ", sampleConfig());

    expect(project.name).toBe("Stage A");
    expect(project.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(project.config.controls).toHaveLength(1);
    expect(project.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects empty names", () => {
    expect(() => createSavedProject("   ", sampleConfig())).toThrow("Project name is required.");
  });
});

describe("sanitizeSavedProject", () => {
  it("accepts valid saved projects", () => {
    const created = createSavedProject("Live", sampleConfig());
    const sanitized = sanitizeSavedProject(created);

    expect(sanitized?.name).toBe("Live");
    expect(sanitized?.config.controls[0]?.type).toBe("button");
  });

  it("rejects invalid entries", () => {
    expect(sanitizeSavedProject(null)).toBeNull();
    expect(sanitizeSavedProject({ id: "x", name: "ok" })).toBeNull();
  });
});

describe("sanitizeSavedProjects", () => {
  it("filters invalid entries", () => {
    const valid = createSavedProject("A", sampleConfig());
    const result = sanitizeSavedProjects([valid, { id: 1 }, null]);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("A");
  });
});

describe("findProjectByName", () => {
  it("matches names case-insensitively", () => {
    const projects = [createSavedProject("Main Stage", sampleConfig())];

    expect(findProjectByName(projects, "main stage")?.name).toBe("Main Stage");
    expect(findProjectByName(projects, "other")).toBeUndefined();
  });
});
