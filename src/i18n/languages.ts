export const APP_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" &&
    APP_LANGUAGES.some((language) => language.code === value)
  );
}
