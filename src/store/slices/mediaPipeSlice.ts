import type { StateCreator } from "zustand";
import {
  defaultMediaPipeConfig,
  defaultMediaPipeLandmarkMapping,
  normalizeMediaPipeLandmarkMapping,
  type MediaPipeConfig,
  type MediaPipeLandmarkMapping,
  type MediaPipeTracker,
} from "../../lib/mediapipe/types";
import type { AppStore } from "../appStoreTypes";

export interface MediaPipeSlice {
  mediapipeConfig: MediaPipeConfig;
  mediapipeMappings: Record<string, MediaPipeLandmarkMapping>;
  setMediaPipeTracker: (tracker: MediaPipeTracker) => void;
  setMediaPipeVideoDevice: (videoDeviceId: string | null) => void;
  toggleMediaPipeLandmark: (landmark: string) => void;
  clearMediaPipeLandmarks: () => void;
  addMediaPipeLandmarks: (landmarks: string[]) => void;
  getMediaPipeLandmarkMapping: (key: string) => MediaPipeLandmarkMapping;
  updateMediaPipeLandmarkMapping: (
    key: string,
    patch: {
      osc?: Partial<MediaPipeLandmarkMapping["osc"]>;
      midi?: Partial<MediaPipeLandmarkMapping["midi"]>;
      mqtt?: Partial<MediaPipeLandmarkMapping["mqtt"]>;
    },
  ) => void;
}

export const createMediaPipeSlice: StateCreator<AppStore, [], [], MediaPipeSlice> = (
  set,
  get,
) => ({
  mediapipeConfig: defaultMediaPipeConfig(),
  mediapipeMappings: {},
  setMediaPipeTracker: (tracker) =>
    set((state) => ({
      mediapipeConfig: {
        ...state.mediapipeConfig,
        tracker,
        selectedLandmarks: [],
      },
    })),
  setMediaPipeVideoDevice: (videoDeviceId) =>
    set((state) => ({
      mediapipeConfig: {
        ...state.mediapipeConfig,
        videoDeviceId,
      },
    })),
  toggleMediaPipeLandmark: (landmark) =>
    set((state) => {
      const selected = state.mediapipeConfig.selectedLandmarks;
      const next = selected.includes(landmark)
        ? selected.filter((value) => value !== landmark)
        : [...selected, landmark];

      return {
        mediapipeConfig: {
          ...state.mediapipeConfig,
          selectedLandmarks: next,
        },
      };
    }),
  clearMediaPipeLandmarks: () =>
    set((state) => ({
      mediapipeConfig: {
        ...state.mediapipeConfig,
        selectedLandmarks: [],
      },
    })),
  addMediaPipeLandmarks: (landmarks) =>
    set((state) => ({
      mediapipeConfig: {
        ...state.mediapipeConfig,
        selectedLandmarks: [
          ...new Set([...state.mediapipeConfig.selectedLandmarks, ...landmarks]),
        ],
      },
    })),
  getMediaPipeLandmarkMapping: (key) => {
    const { performerIo } = get();
    const stored = get().mediapipeMappings[key];
    return stored
      ? normalizeMediaPipeLandmarkMapping(stored, performerIo, key)
      : defaultMediaPipeLandmarkMapping(key, performerIo);
  },
  updateMediaPipeLandmarkMapping: (key, patch) => {
    const { performerIo } = get();
    const stored = get().mediapipeMappings[key];
    const current = stored
      ? normalizeMediaPipeLandmarkMapping(stored, performerIo, key)
      : defaultMediaPipeLandmarkMapping(key, performerIo);

    set((state) => ({
      mediapipeMappings: {
        ...state.mediapipeMappings,
        [key]: {
          ...current,
          ...patch,
          osc: { ...current.osc, ...patch.osc },
          midi: { ...current.midi, ...patch.midi },
          mqtt: { ...current.mqtt, ...patch.mqtt },
        },
      },
    }));
  },
});
