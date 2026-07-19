import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  findProjectByName,
  MAX_SAVED_PROJECTS,
  PROJECT_LIBRARY_STORAGE_KEY,
  type SavedProject,
  sanitizeSavedProjects,
} from "../lib/projectLibrary";

interface ProjectLibraryState {
  projects: SavedProject[];
  saveProject: (project: SavedProject) => void;
  removeProject: (id: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const useProjectLibraryStore = create<ProjectLibraryState>()(
  persist(
    (set) => ({
      projects: [],
      saveProject: (project) =>
        set((state) => {
          const existingByName = findProjectByName(state.projects, project.name);
          const replaceId = existingByName?.id ?? project.id;
          const next: SavedProject = {
            ...project,
            id: replaceId,
          };

          return {
            projects: [next, ...state.projects.filter((entry) => entry.id !== replaceId)].slice(
              0,
              MAX_SAVED_PROJECTS,
            ),
          };
        }),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        })),
    }),
    {
      name: PROJECT_LIBRARY_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        projects: state.projects,
      }),
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {};
        return {
          ...currentState,
          projects: sanitizeSavedProjects(persisted.projects),
        };
      },
    },
  ),
);
