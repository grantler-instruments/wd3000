import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { Box, Button, IconButton, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function SubsectionHeader({
  title,
  description,
  onAdd,
  addLabel,
  secondaryAddLabel,
  onSecondaryAdd,
  secondaryAddDisabled,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
  secondaryAddLabel?: string;
  onSecondaryAdd?: () => void;
  secondaryAddDisabled?: boolean;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        alignItems: { xs: "stretch", sm: "flex-start" },
        justifyContent: "space-between",
        mb: 1.5,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          flexShrink: 0,
          alignSelf: { xs: "flex-start", sm: "auto" },
          mt: { xs: 0, sm: 0.25 },
          flexWrap: "wrap",
        }}
      >
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>
          {addLabel}
        </Button>
        {secondaryAddLabel && onSecondaryAdd ? (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={onSecondaryAdd}
            disabled={secondaryAddDisabled}
          >
            {secondaryAddLabel}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 2.5,
        bgcolor: "action.hover",
        borderStyle: "dashed",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Paper>
  );
}

export function EndpointCard({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1.25,
        display: "flex",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <IconButton size="small" aria-label={removeLabel} onClick={onRemove} sx={{ flexShrink: 0 }}>
        <DeleteOutlinedIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
