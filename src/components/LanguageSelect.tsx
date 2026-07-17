import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useTranslation } from "react-i18next";
import { APP_LANGUAGES, type AppLanguage } from "../i18n/languages";
import { useAppStore } from "../store/useAppStore";

export function LanguageSelect() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="app-language-label">{t("languages.label")}</InputLabel>
      <Select
        labelId="app-language-label"
        label={t("languages.label")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
      >
        {APP_LANGUAGES.map((item) => (
          <MenuItem key={item.code} value={item.code}>
            {item.nativeLabel}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
