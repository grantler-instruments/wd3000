import type { StateCreator } from "zustand";
import type { PersistedAppConfig } from "../../lib/config";
import { replacePerformerWithoutHistory } from "../../lib/performer-history";
import {
  defaultLayoutSettings,
  defaultOutputConfig,
  defaultPerformerIoConfig,
} from "../../types";
import { reindexOrders } from "../helpers/controlTree";
import type { AppStore } from "../appStoreTypes";

export interface ProjectSlice {
  importConfig: (config: PersistedAppConfig) => void;
  newProject: () => void;
}

export const createProjectSlice: StateCreator<AppStore, [], [], ProjectSlice> = (
  set,
) => ({
  importConfig: (config) =>
    replacePerformerWithoutHistory(() => {
      set({
        controls: reindexOrders(config.controls),
        output: config.output,
        performerIo: config.performerIo,
        layoutSettings: config.layoutSettings,
        selectedControlId: null,
        inspectorControlId: null,
        controlValues: {},
        controlActiveNotes: {},
        controlPadValues: {},
        controlTabIndex: {},
      });
    }),
  newProject: () =>
    replacePerformerWithoutHistory(() => {
      const output = defaultOutputConfig();
      set({
        controls: [],
        output,
        performerIo: defaultPerformerIoConfig(output),
        layoutSettings: defaultLayoutSettings(),
        selectedControlId: null,
        inspectorControlId: null,
        controlValues: {},
        controlActiveNotes: {},
        controlPadValues: {},
        controlTabIndex: {},
        controlClipboard: null,
      });
    }),
});
