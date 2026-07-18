/** Shared layout helpers for debugger composers / monitors. */

export const debuggerFillSx = {
  display: "flex",
  flexDirection: "column",
} as const;

/** Message history region inside a scrolling monitor details panel. */
export const debuggerLogSx = {
  minHeight: 240,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.paper",
} as const;

export const debuggerComposerRowSx = {
  alignItems: { xs: "stretch", sm: "center" },
  flexWrap: "wrap",
} as const;
