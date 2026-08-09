import type { CounterpointScore } from '../counterpoint/model';
import { classifyIntervalSemitones } from './consonance';
import { intervalInfo } from './interval';

export interface CadenceAnalysis {
  detected: boolean;
  startTick: number;
  endTick: number;
  quality: 'strong' | 'acceptable' | 'weak' | 'invalid';
  explanation: string;
}

export function analyzeCadence(score: CounterpointScore): CadenceAnalysis {
  const voices = score.voices.filter((voice) => voice.notes.length > 0);
  if (voices.length < 2) {
    return { detected: false, startTick: 0, endTick: 0, quality: 'invalid', explanation: 'Not enough voices.' };
  }
  const lastTick = Math.max(...voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)));
  const penultTick = Math.max(0, lastTick - score.ticksPerWhole);
  const finalPitches = voices.map((voice) => voice.notes.filter((note) => note.startTick + note.durationTicks === lastTick).at(-1)?.midi ?? voice.notes.at(-1)!.midi);
  const finalInterval = intervalInfo(finalPitches[0], finalPitches[finalPitches.length - 1], true);
  const finalConsonant = classifyIntervalSemitones(finalInterval.semitones, true) !== 'dissonant';
  const quality = finalConsonant ? 'strong' : 'invalid';
  return {
    detected: finalConsonant,
    startTick: penultTick,
    endTick: lastTick,
    quality,
    explanation: finalConsonant
      ? 'Final sonority is consonant and resolves into a stable ending.'
      : 'The final sonority is dissonant or unstable.'
  };
}

