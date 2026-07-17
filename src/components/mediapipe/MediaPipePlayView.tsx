import { Box } from "@mui/material";
import { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { MediaPipePreview } from "./MediaPipePreview";

/** Fullscreen MediaPipe run view: camera + overlay only. */
export function MediaPipePlayView() {
  const setMediaPipeActive = useAppStore((state) => state.setMediaPipeActive);

  useEffect(() => {
    setMediaPipeActive(true);
  }, [setMediaPipeActive]);

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
