import { Box, Stack, Typography } from "@mui/material";

export function MediaPipePerformerPanel() {
  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          MediaPipe
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Not configured yet.
        </Typography>
      </Box>
    </Stack>
  );
}
