import type { IoSlice } from "./slices/ioSlice";
import type { MediaPipeSlice } from "./slices/mediaPipeSlice";
import type { PerformerSlice } from "./slices/performerSlice";
import type { ProjectSlice } from "./slices/projectSlice";
import type { SensorsSlice } from "./slices/sensorsSlice";
import type { UiSlice } from "./slices/uiSlice";

export type AppStore = UiSlice &
  PerformerSlice &
  IoSlice &
  SensorsSlice &
  MediaPipeSlice &
  ProjectSlice;
