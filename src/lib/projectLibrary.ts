import { type PersistedAppConfig, parsePersistedConfig } from "./config";

export const MAX_SAVED_PROJECTS = 50;
export const PROJECT_LIBRARY_STORAGE_KEY = "wd3000-project-library";

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string;
  config: PersistedAppConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function createSavedProject(name: string, config: PersistedAppConfig): SavedProject {
  const normalized = normalizeProjectName(name);
  if (!normalized) {
    throw new Error("Project name is required.");
  }

  return {
    id: crypto.randomUUID(),
    name: normalized,
    savedAt: new Date().toISOString(),
    config: parsePersistedConfig(config),
  };
}

export function sanitizeSavedProject(value: unknown): SavedProject | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  const name = normalizeProjectName(value.name);
  if (!name) {
    return null;
  }

  try {
    return {
      id: value.id,
      name,
      savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
      config: parsePersistedConfig(value.config),
    };
  } catch {
    return null;
  }
}

export function sanitizeSavedProjects(value: unknown): SavedProject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(sanitizeSavedProject)
    .filter((project): project is SavedProject => project !== null)
    .slice(0, MAX_SAVED_PROJECTS);
}

export function findProjectByName(
  projects: SavedProject[],
  name: string,
): SavedProject | undefined {
  const normalized = normalizeProjectName(name).toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return projects.find((project) => project.name.toLowerCase() === normalized);
}
