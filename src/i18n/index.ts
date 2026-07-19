import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE } from "./languages";
import de from "./locales/de";
import en from "./locales/en";
import es from "./locales/es";
import zh from "./locales/zh";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    de: { translation: de },
    zh: { translation: zh },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language === "zh" ? "zh-Hans" : language;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language === "zh" ? "zh-Hans" : i18n.language;
}

export default i18n;
