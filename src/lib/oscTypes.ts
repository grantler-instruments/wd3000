export type OscArgType = "int" | "float" | "string" | "true" | "false";

export const OSC_ARG_TYPES: OscArgType[] = [
  "int",
  "float",
  "string",
  "true",
  "false",
];

export function oscArgTypeLabel(type: OscArgType) {
  switch (type) {
    case "int":
      return "Int (i)";
    case "float":
      return "Float (f)";
    case "string":
      return "String (s)";
    case "true":
      return "True (T)";
    case "false":
      return "False (F)";
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
