export type Consonance = 'perfect' | 'imperfect' | 'dissonant';

export function classifyIntervalSemitones(semitones: number, treatFourthAboveBassAsDissonant = true): Consonance {
  const pc = ((Math.abs(semitones) % 12) + 12) % 12;
  if (pc === 0 || pc === 7) return 'perfect';
  if (pc === 3 || pc === 4 || pc === 8 || pc === 9) return 'imperfect';
  if (pc === 5) return treatFourthAboveBassAsDissonant ? 'dissonant' : 'perfect';
  return 'dissonant';
}

export function isPerfectConsonance(semitones: number): boolean {
  return classifyIntervalSemitones(semitones) === 'perfect';
}

export function isImperfectConsonance(semitones: number): boolean {
  return classifyIntervalSemitones(semitones) === 'imperfect';
}

export function isDissonance(semitones: number): boolean {
  return classifyIntervalSemitones(semitones) === 'dissonant';
}

