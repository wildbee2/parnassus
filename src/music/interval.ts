import { classifyIntervalSemitones } from './consonance';

export type IntervalQuality = 'perfect' | 'major' | 'minor' | 'augmented' | 'diminished' | 'other';

export interface IntervalInfo {
  semitones: number;
  absSemitones: number;
  simpleNumber: number;
  compoundNumber: number;
  intervalClass: number;
  quality: IntervalQuality;
  consonance: ReturnType<typeof classifyIntervalSemitones>;
}

function intervalNumberFromSemitones(absSemitones: number): number {
  const mapping: Record<number, number> = {
    0: 1,
    1: 2,
    2: 2,
    3: 3,
    4: 3,
    5: 4,
    6: 4,
    7: 5,
    8: 6,
    9: 6,
    10: 7,
    11: 7,
    12: 8
  };
  return mapping[absSemitones % 12] ?? 8;
}

function qualityFromSemitones(absSemitones: number): IntervalQuality {
  const pc = absSemitones % 12;
  if ([0, 5, 7, 12].includes(absSemitones)) return 'perfect';
  if ([3, 4, 8, 9].includes(pc)) return pc === 3 || pc === 8 ? 'minor' : 'major';
  if (pc === 1 || pc === 6 || pc === 11) return 'augmented';
  if (pc === 2 || pc === 10) return 'minor';
  return 'other';
}

export function intervalInfo(aMidi: number, bMidi: number, treatFourthAboveBassAsDissonant = true): IntervalInfo {
  const semitones = bMidi - aMidi;
  const absSemitones = Math.abs(semitones);
  const simpleNumber = intervalNumberFromSemitones(absSemitones);
  const compoundNumber = simpleNumber + 7 * Math.floor(absSemitones / 12);
  const intervalClass = absSemitones % 12;
  return {
    semitones,
    absSemitones,
    simpleNumber,
    compoundNumber,
    intervalClass,
    quality: qualityFromSemitones(absSemitones),
    consonance: classifyIntervalSemitones(semitones, treatFourthAboveBassAsDissonant)
  };
}

export function intervalLabel(info: IntervalInfo): string {
  const q = info.quality === 'perfect' ? 'P' : info.quality === 'major' ? 'M' : info.quality === 'minor' ? 'm' : info.quality === 'augmented' ? 'A' : 'd';
  return `${q}${info.simpleNumber}`;
}

export function melodicIntervalLabel(aMidi: number, bMidi: number): string {
  return intervalLabel(intervalInfo(aMidi, bMidi));
}

