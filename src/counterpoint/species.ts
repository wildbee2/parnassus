import type { CounterpointScore, Species, Voice } from './model';

export function speciesDurations(species: Species | undefined, ticksPerWhole: number): number[] {
  switch (species) {
    case 'second':
      return [ticksPerWhole / 2, ticksPerWhole / 2];
    case 'third':
      return [ticksPerWhole / 4, ticksPerWhole / 4, ticksPerWhole / 4, ticksPerWhole / 4];
    case 'fourth':
      return [ticksPerWhole, ticksPerWhole];
    case 'fifth':
      return [ticksPerWhole / 2, ticksPerWhole / 2, ticksPerWhole / 4, ticksPerWhole / 4];
    default:
      return [ticksPerWhole];
  }
}

export function speciesDurationAtIndex(species: Species | undefined, index: number, ticksPerWhole: number): number {
  const durations = speciesDurations(species, ticksPerWhole);
  return durations[index % durations.length];
}

export function voiceEndTick(voice: Voice): number {
  return voice.notes.reduce((maxTick, note) => Math.max(maxTick, note.startTick + note.durationTicks), 0);
}

export function scoreEndTick(score: CounterpointScore): number {
  return Math.max(...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)), 0);
}
