import type { SxProps, Theme } from "@mui/material";

export const stackedAccordionSx: SxProps<Theme> = {
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "action.hover",
  "&:before": { display: "none" },
  margin: 0,
  "&.Mui-expanded": { margin: 0 },
};
