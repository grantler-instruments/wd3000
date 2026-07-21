import { Box, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { LanguageSelect } from "../LanguageSelect";

export function GeneralSettingsPanel() {
  const { t } = useTranslation();

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {t("control.general")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("settings.generalDescription")}
        </Typography>
      </Box>
      <LanguageSelect />
    </Stack>
  );
}
