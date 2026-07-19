export type InstrumentType = "synth" | "rhodes";

export const INSTRUMENT_TYPES: InstrumentType[] = ["synth", "rhodes"];

export function isInstrumentType(value: unknown): value is InstrumentType {
  return value === "synth" || value === "rhodes";
}
