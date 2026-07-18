import type { StateCreator } from "zustand";
import i18n from "../../i18n";
import { DEFAULT_LANGUAGE, type AppLanguage } from "../../i18n/languages";
import type {
  AppMode,
  DashboardView,
  DebuggerSubView,
  PerformerSubView,
} from "../../types";
import type { AppStore } from "../appStoreTypes";

export interface UiSlice {
  mode: AppMode;
  activeView: DashboardView;
  performerSubView: PerformerSubView;
  debuggerSubView: DebuggerSubView;
  language: AppLanguage;
  lastError: string | null;
  setLanguage: (language: AppLanguage) => void;
  setMode: (mode: AppMode) => void;
  setActiveView: (
    view: DashboardView,
    subView?: PerformerSubView | DebuggerSubView,
  ) => void;
  setLastError: (message: string | null) => void;
}

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (set) => ({
  mode: "edit",
  activeView: "home",
  performerSubView: "ui",
  debuggerSubView: "midi",
  language: DEFAULT_LANGUAGE,
  lastError: null,
  setLanguage: (language) => {
    void i18n.changeLanguage(language);
    set({ language });
  },
  setMode: (mode) => set({ mode }),
  setActiveView: (view, subView) =>
    set((state) => {
      if (view === "home") {
        return { activeView: "home" };
      }

      if (view === "performer") {
        return {
          activeView: view,
          performerSubView: (subView as PerformerSubView | undefined) ?? state.performerSubView,
        };
      }

      return {
        activeView: view,
        debuggerSubView: (subView as DebuggerSubView | undefined) ?? state.debuggerSubView,
      };
    }),
  setLastError: (message) => set({ lastError: message }),
});
