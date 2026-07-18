import { Box } from "@mui/material";
import { MediaPipePreview } from "./MediaPipePreview";

/** Fullscreen MediaPipe run view: camera + overlay only. */
export function MediaPipePlayView() {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <MediaPipePreview fill />
    </Box>
  );
}
