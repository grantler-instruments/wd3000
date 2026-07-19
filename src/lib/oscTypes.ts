import i18n from "../i18n";

export type OscArgType = "int" | "float" | "string" | "true" | "false";

export const OSC_ARG_TYPES: OscArgType[] = ["int", "float", "string", "true", "false"];

export function oscArgTypeLabel(type: OscArgType) {
  switch (type) {
    case "int":
      return i18n.t("oscComposer.int");
    case "float":
      return i18n.t("oscComposer.float");
    case "string":
      return i18n.t("oscComposer.string");
    case "true":
      return i18n.t("oscComposer.trueT");
    case "false":
      return i18n.t("oscComposer.falseF");
  }
}

export function oscArgTypeTag(type: OscArgType) {
  switch (type) {
    case "int":
      return "i";
    case "float":
      return "f";
    case "string":
      return "s";
    case "true":
      return "T";
    case "false":
      return "F";
  }
}

export function oscArgTypeRequiresValue(type: OscArgType) {
  return type !== "true" && type !== "false";
}
