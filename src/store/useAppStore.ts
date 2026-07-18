import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppStore } from "./appStoreTypes";
import { appStorePersistOptions } from "./persist";
import { createIoSlice } from "./slices/ioSlice";
import { createMediaPipeSlice } from "./slices/mediaPipeSlice";
import { createPerformerSlice } from "./slices/performerSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createSensorsSlice } from "./slices/sensorsSlice";
import { createUiSlice } from "./slices/uiSlice";

export type { AppStore } from "./appStoreTypes";

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createUiSlice(...args),
      ...createPerformerSlice(...args),
      ...createIoSlice(...args),
      ...createSensorsSlice(...args),
      ...createMediaPipeSlice(...args),
      ...createProjectSlice(...args),
    }),
    appStorePersistOptions,
  ),
);
