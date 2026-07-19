/** MIDI note number → Hz (A4 = 440). */
export function midiToFreq(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}
