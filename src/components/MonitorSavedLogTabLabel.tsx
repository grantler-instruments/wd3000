import CloseIcon from "@mui/icons-material/Close";
import { IconButton, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";

interface MonitorSavedLogTabLabelProps {
  name: string;
  onDelete: () => void;
  deleteDisabled?: boolean;
}

/** Label-only: keep a real MUI `Tab` as the Tabs child so selection works. */
export function MonitorSavedLogTabLabel({
  name,
  onDelete,
  deleteDisabled = false,
}: MonitorSavedLogTabLabelProps) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <span>{name}</span>
      <IconButton
        component="span"
        size="small"
        aria-label={t("common.delete")}
        disabled={deleteDisabled}
        onMouseDown={(event) => {
          // Prevent Tab selection when pressing delete.
          event.stopPropagation();
          event.preventDefault();
        }}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onDelete();
        }}
        sx={{ p: 0.25, ml: 0.25 }}
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Stack>
  );
}
