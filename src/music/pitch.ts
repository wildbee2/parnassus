export const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

export type PitchClass = number;

export function clampMidi(midi: number): number {
  return Math.max(0, Math.min(127, midi));
}

export function midiToPitchClass(midi: number): PitchClass {
  return ((midi % 12) + 12) % 12;
}

export function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[midiToPitchClass(midi)]}${Math.floor(midi / 12) - 1}`;
}

export function pitchNameToMidi(input: string): number {
  const match = input.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`${input} is not a recognized pitch name`);
  }
  const [, letterRaw, accidental, octaveRaw] = match;
  const letter = letterRaw.toUpperCase();
  const octave = Number(octaveRaw);
  const base = NOTE_TO_PC[letter];
  const accidentalOffset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return clampMidi((octave + 1) * 12 + base + accidentalOffset);
}

export function midiDistance(a: number, b: number): number {
  return b - a;
}

export function absMidiDistance(a: number, b: number): number {
  return Math.abs(b - a);
}

export function isWhiteKeyMidi(midi: number): boolean {
  return [0, 2, 4, 5, 7, 9, 11].includes(midiToPitchClass(midi));
}

export function nearestMidiInRange(target: number, min: number, max: number): number {
  return clampMidi(Math.max(min, Math.min(max, target)));
}

