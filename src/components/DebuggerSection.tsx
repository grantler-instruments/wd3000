import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { useState } from "react";
import { stackedAccordionSx } from "./stackedAccordionSx";

interface DebuggerSectionProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  headerAction?: ReactNode;
  flexGrow?: boolean;
  defaultExpanded?: boolean;
}

export function DebuggerSection({
  title,
  description,
  children,
  headerAction,
  flexGrow = false,
  defaultExpanded,
}: DebuggerSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? flexGrow);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{
        ...stackedAccordionSx,
        ...(flexGrow
          ? {
              flex: expanded ? 1 : "0 0 auto",
              height: expanded ? "100%" : "auto",
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : {}),
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ flexShrink: 0 }}>
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
          {typeof title === "string" ? (
            <Typography variant="subtitle2">{title}</Typography>
          ) : (
            title
          )}
          {headerAction}
        </Stack>
      </AccordionSummary>

      <AccordionDetails
        sx={
          flexGrow && expanded
            ? {
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }
            : undefined
        }
      >
        <Stack
          spacing={1.5}
          sx={
            flexGrow && expanded
              ? { flex: 1, minHeight: 0, overflow: "hidden" }
              : undefined
          }
        >
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
          {children}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
