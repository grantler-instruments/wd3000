export interface LandmarkHotspot {
  label: string;
  x: number;
  y: number;
}

export const POSE_LANDMARK_LABELS = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
] as const;

export const HAND_LANDMARK_LABELS = [
  "wrist",
  "thumb_cmc",
  "thumb_mcp",
  "thumb_ip",
  "thumb_tip",
  "index_finger_mcp",
  "index_finger_pip",
  "index_finger_dip",
  "index_finger_tip",
  "middle_finger_mcp",
  "middle_finger_pip",
  "middle_finger_dip",
  "middle_finger_tip",
  "ring_finger_mcp",
  "ring_finger_pip",
  "ring_finger_dip",
  "ring_finger_tip",
  "pinky_mcp",
  "pinky_pip",
  "pinky_dip",
  "pinky_tip",
] as const;

export const HAND_LANDMARK_HOTSPOTS: LandmarkHotspot[] = [
  { label: "wrist", x: 90, y: 204 },
  { label: "thumb_cmc", x: 115, y: 181 },
  { label: "thumb_mcp", x: 140, y: 158 },
  { label: "thumb_ip", x: 165, y: 135 },
  { label: "thumb_tip", x: 190, y: 112 },
  { label: "index_finger_mcp", x: 123, y: 107 },
  { label: "index_finger_pip", x: 126, y: 78 },
  { label: "index_finger_dip", x: 129, y: 49 },
  { label: "index_finger_tip", x: 132, y: 20 },
  { label: "middle_finger_mcp", x: 90, y: 104 },
  { label: "middle_finger_pip", x: 88, y: 68 },
  { label: "middle_finger_dip", x: 86, y: 32 },
  { label: "middle_finger_tip", x: 84, y: -4 },
  { label: "ring_finger_mcp", x: 58, y: 111 },
  { label: "ring_finger_pip", x: 51, y: 79 },
  { label: "ring_finger_dip", x: 44, y: 47 },
  { label: "ring_finger_tip", x: 37, y: 15 },
  { label: "pinky_mcp", x: 32, y: 127 },
  { label: "pinky_pip", x: 22, y: 105 },
  { label: "pinky_dip", x: 12, y: 83 },
  { label: "pinky_tip", x: 2, y: 61 },
];

export const POSE_HANDS_HOTSPOTS: LandmarkHotspot[] = [
  { label: "left_pinky", x: 8, y: 86 },
  { label: "left_index", x: 75, y: 65 },
  { label: "left_thumb", x: 100, y: 115 },
  { label: "right_pinky", x: 220, y: 86 },
  { label: "right_index", x: 156, y: 65 },
  { label: "right_thumb", x: 130, y: 115 },
];

export const POSE_FACE_HOTSPOTS: LandmarkHotspot[] = [
  { label: "nose", x: 126, y: 110 },
  { label: "left_eye", x: 78, y: 67 },
  { label: "left_eye_inner", x: 101, y: 67 },
  { label: "left_eye_outer", x: 55, y: 67 },
  { label: "right_eye", x: 158, y: 67 },
  { label: "right_eye_inner", x: 135, y: 67 },
  { label: "right_eye_outer", x: 181, y: 67 },
  { label: "left_ear", x: 13, y: 89 },
  { label: "right_ear", x: 217, y: 89 },
  { label: "mouth_left", x: 103, y: 169 },
  { label: "mouth_right", x: 136, y: 169 },
];

export const POSE_BODY_HOTSPOTS: LandmarkHotspot[] = [
  { label: "left_shoulder", x: 92, y: 34 },
  { label: "right_shoulder", x: 138, y: 34 },
  { label: "left_elbow", x: 82, y: 74 },
  { label: "right_elbow", x: 148, y: 74 },
  { label: "left_wrist", x: 60, y: 103 },
  { label: "right_wrist", x: 169, y: 103 },
  { label: "left_hip", x: 102, y: 113 },
  { label: "right_hip", x: 128, y: 113 },
  { label: "left_knee", x: 101, y: 161 },
  { label: "right_knee", x: 129, y: 161 },
  { label: "left_ankle", x: 100, y: 200 },
  { label: "right_ankle", x: 130, y: 200 },
  { label: "left_heel", x: 100, y: 225 },
  { label: "right_heel", x: 130, y: 225 },
  { label: "left_foot_index", x: 72, y: 225 },
  { label: "right_foot_index", x: 158, y: 225 },
];

export const MEDIAPIPE_PREVIEW_WIDTH = 1280;
export const MEDIAPIPE_PREVIEW_HEIGHT = 960;

function publicAssetPath(path: string) {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

export function mediapipeSketchPath(filename: string) {
  return publicAssetPath(`mediapipe/${filename}`);
}

export function poseModelPath(file: string) {
  return publicAssetPath(`models/pose/${file}`);
}

export function handsModelPath(file: string) {
  return publicAssetPath(`models/hands/${file}`);
}
