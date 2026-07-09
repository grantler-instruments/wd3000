import { Box } from "@mui/material";

interface GrantlerLogoProps {
  height?: number;
}

export function GrantlerLogo({ height = 28 }: GrantlerLogoProps) {
  return (
    <Box
      component="img"
      src="/logo_v1.svg"
      alt="Grantler Instruments"
      draggable={false}
      sx={{ height, width: "auto", display: "block", pointerEvents: "none" }}
    />
  );
}
