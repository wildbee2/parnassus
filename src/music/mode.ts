export type ModeName =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'major'
  | 'natural_minor';

export const MODE_STEPS: Record<ModeName, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10]
};

export function modePitchClasses(mode: ModeName, tonicPc: number): number[] {
  return MODE_STEPS[mode].map((step) => (tonicPc + step) % 12);
}

export function modeDegreeToPc(mode: ModeName, tonicPc: number, degree: number): number {
  const steps = MODE_STEPS[mode];
  return (tonicPc + steps[((degree - 1) % 7 + 7) % 7]) % 12;
}

export function modeNameLabel(mode: ModeName): string {
  return mode
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

