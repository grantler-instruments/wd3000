import type { OscArgType } from "./oscTypes";
import { oscArgTypeRequiresValue, oscArgTypeTag } from "./oscTypes";

export interface OscComposerArg {
  type: OscArgType;
  intValue: number;
  floatValue: number;
  stringValue: string;
}

export interface OscArgPayload {
  type: OscArgType;
  value?: number | string;
}

export function defaultOscComposerArg(): OscComposerArg {
  return {
    type: "float",
    intValue: 0,
    floatValue: 0.5,
    stringValue: "",
  };
}

export function toOscArgPayload(arg: OscComposerArg): OscArgPayload {
  switch (arg.type) {
    case "int":
      return { type: "int", value: arg.intValue };
    case "float":
      return { type: "float", value: arg.floatValue };
    case "string":
      return { type: "string", value: arg.stringValue };
    case "true":
      return { type: "true" };
    case "false":
      return { type: "false" };
  }
}

export function formatOscMonitorArgValue(arg: OscArgPayload): string | null {
  if (!oscArgTypeRequiresValue(arg.type)) {
    return null;
  }

  switch (arg.type) {
    case "int":
    case "float":
      return String(arg.value ?? 0);
    case "string":
      return JSON.stringify(arg.value ?? "");
  }
}

export function formatOscMonitorSummary(address: string, args: OscArgPayload[]) {
  if (args.length === 0) {
    return address;
  }

  const tags = args.map((arg) => oscArgTypeTag(arg.type)).join("");
  const values = args
    .map(formatOscMonitorArgValue)
    .filter((value): value is string => value !== null)
    .join(", ");

  if (!values) {
    return `${address} [${tags}]`;
  }

  return `${address} [${tags}] ${values}`;
}

export function formatOscMessageSummary(address: string, args: OscComposerArg[]) {
  return formatOscMonitorSummary(address, args.map(toOscArgPayload));
}
