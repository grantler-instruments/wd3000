import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
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

/**
 * Fill-height monitors cannot use MUI Accordion/Collapse: Collapse sets
 * height:auto from content, so the body never gets a bounded box to scroll.
 */
export function DebuggerSection({
  title,
  description,
  children,
  headerAction,
  flexGrow = false,
  defaultExpanded,
}: DebuggerSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? flexGrow);

  if (flexGrow) {
    return (
      <Box
        sx={{
          ...stackedAccordionSx,
          flex: expanded ? { xs: "0 0 auto", md: 1 } : "0 0 auto",
          minHeight: expanded ? { xs: 280, md: 0 } : undefined,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          onClick={() => setExpanded((current) => !current)}
          sx={{
            flexShrink: 0,
            alignItems: "center",
            minHeight: 48,
            px: 2,
            py: 1,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
              minWidth: 0,
              pr: 1,
            }}
          >
            {typeof title === "string" ? (
              <Typography variant="subtitle2">{title}</Typography>
            ) : (
              title
            )}
            {headerAction ? (
              <Box
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {headerAction}
              </Box>
            ) : null}
          </Stack>
          <ExpandMoreIcon
            sx={{
              flexShrink: 0,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: (theme) =>
                theme.transitions.create("transform", {
                  duration: theme.transitions.duration.shortest,
                }),
            }}
          />
        </Stack>

        {expanded ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              overscrollBehavior: "contain",
              px: 2,
              pb: 2,
            }}
          >
            <Stack spacing={1.5}>
              {description ? (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              ) : null}
              {children}
            </Stack>
          </Box>
        ) : null}
      </Box>
    );
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      disableGutters
      elevation={0}
      sx={{ ...stackedAccordionSx, flexShrink: 0 }}
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
            minWidth: 0,
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

      <AccordionDetails>
        <Stack spacing={1.5}>
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
