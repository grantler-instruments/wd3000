import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

function formatValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return value.toFixed(2);
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

export function SensorAxisRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {formatValue(value)}
        {unit ? ` ${unit}` : ""}
      </Typography>
    </Stack>
  );
}

export function SensorCard({
  title,
  description,
  watching,
  onToggleWatch,
  children,
}: {
  title: string;
  description?: string;
  watching?: boolean;
  onToggleWatch?: (watching: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (watching) {
      setExpanded(true);
    }
  }, [watching]);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        border: 1,
        borderColor: watching ? "primary.main" : "divider",
        borderRadius: 2,
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            pr: 1,
          }}
        >
          <Typography variant="subtitle1">{title}</Typography>
          {onToggleWatch ? (
            <Switch
              size="small"
              checked={watching ?? false}
              onClick={stopPropagation}
              onChange={(_, checked) => onToggleWatch(checked)}
              aria-label={
                watching
                  ? t("sensors.stopNamed", { title })
                  : t("sensors.startNamed", { title })
              }
            />
          ) : null}
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Stack spacing={1.5}>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
          <Stack spacing={0.75}>{children}</Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
