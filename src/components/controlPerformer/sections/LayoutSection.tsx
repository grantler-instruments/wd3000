import { Stack, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useViewportSize } from "../../../hooks/useViewportSize";
import { useAppStore } from "../../../store/useAppStore";
import { controlCanvasSizeLimits, controlLayoutHeight } from "../../../types";
import { type InspectorSectionProps, SectionIntro } from "../shared";

export function LayoutSection({ control, compact = false }: InspectorSectionProps) {
  const { t } = useTranslation();
  const updateControlLayout = useAppStore((state) => state.updateControlLayout);
  const { width: canvasWidth, height: canvasHeight } = useViewportSize();
  const sizeLimits = controlCanvasSizeLimits(
    control,
    { width: canvasWidth, height: canvasHeight },
    true,
  );

  return (
    <Stack spacing={2.5}>
      <SectionIntro
        title={t("control.layout")}
        description={t("control.layoutDescription")}
        compact={compact}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label={t("common.width")}
          size="small"
          type="number"
          fullWidth
          slotProps={{
            htmlInput: { min: sizeLimits.minWidth, max: sizeLimits.maxWidth, step: 16 },
          }}
          value={control.layout.width}
          onChange={(event) =>
            updateControlLayout(control.id, {
              width: Math.min(
                sizeLimits.maxWidth,
                Math.max(sizeLimits.minWidth, Number(event.target.value) || sizeLimits.minWidth),
              ),
            })
          }
        />
        <TextField
          label={t("common.height")}
          size="small"
          type="number"
          fullWidth
          slotProps={{
            htmlInput: { min: sizeLimits.minHeight, max: sizeLimits.maxHeight, step: 16 },
          }}
          value={control.layout.height ?? controlLayoutHeight(control)}
          onChange={(event) =>
            updateControlLayout(control.id, {
              height: Math.min(
                sizeLimits.maxHeight,
                Math.max(sizeLimits.minHeight, Number(event.target.value) || sizeLimits.minHeight),
              ),
            })
          }
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          label="X"
          size="small"
          type="number"
          fullWidth
          value={control.layout.x}
          onChange={(event) =>
            updateControlLayout(control.id, {
              x: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          fullWidth
          value={control.layout.y}
          onChange={(event) =>
            updateControlLayout(control.id, {
              y: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
      </Stack>
    </Stack>
  );
}
