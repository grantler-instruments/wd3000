import { Box, Stack, Switch, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Control } from "../../types";

export type InspectorSection = "general" | "layout" | "osc" | "midi" | "mqtt";

export type InspectorSectionProps = {
  control: Control;
  compact?: boolean;
};

export function SectionIntro({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

export function ProtocolEnableSection({
  label,
  enabled,
  onToggle,
  description,
  children,
  compact = false,
}: {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Stack spacing={enabled ? 2.5 : 0}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: compact ? "center" : "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {!compact && (
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {label}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Switch
          checked={enabled}
          onChange={(_, checked) => onToggle(checked)}
          aria-label={
            enabled ? t("sensors.disableNamed", { label }) : t("sensors.enableNamed", { label })
          }
          sx={{ flexShrink: 0, mt: compact ? 0 : 0.25 }}
        />
      </Stack>
      {enabled ? <Stack spacing={2.5}>{children}</Stack> : null}
    </Stack>
  );
}

export function ColorSwatch({
  color,
  selected,
  label,
  onClick,
}: {
  color?: string;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 28,
        height: 28,
        p: 0,
        borderRadius: "50%",
        border: 2,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: color ?? "background.default",
        backgroundImage: color
          ? undefined
          : (theme) =>
              `linear-gradient(135deg, transparent 46%, ${theme.palette.divider} 46%, ${theme.palette.divider} 54%, transparent 54%)`,
        cursor: "pointer",
        flexShrink: 0,
      }}
    />
  );
}
