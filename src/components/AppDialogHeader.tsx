import CloseIcon from "@mui/icons-material/Close";
import { Box, DialogTitle, IconButton, Typography } from "@mui/material";
import { ReactNode } from "react";

interface DialogCloseButtonProps {
  onClose: () => void;
}

export function DialogCloseButton({ onClose }: DialogCloseButtonProps) {
  return (
    <IconButton
      onClick={onClose}
      aria-label="Close"
      size="small"
      sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );
}

interface AppDialogTitleProps {
  children: ReactNode;
  onClose: () => void;
}

export function AppDialogTitle({ children, onClose }: AppDialogTitleProps) {
  return (
    <DialogTitle
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        pr: 1.5,
      }}
    >
      <Box component="span" sx={{ minWidth: 0 }}>
        {children}
      </Box>
      <DialogCloseButton onClose={onClose} />
    </DialogTitle>
  );
}

interface AppDialogHeaderProps {
  title: string;
  onClose: () => void;
  subtitle?: ReactNode;
}

export function AppDialogHeader({ title, onClose, subtitle }: AppDialogHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        px: { xs: 2, sm: 2.5 },
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "baseline" },
          justifyContent: "space-between",
          gap: { xs: 0.25, sm: 2 },
        }}
      >
        <Typography variant="h6" component="h2" noWrap sx={{ maxWidth: "100%" }}>
          {title}
        </Typography>
        {subtitle}
      </Box>
      <DialogCloseButton onClose={onClose} />
    </Box>
  );
}
