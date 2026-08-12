import type { CounterpointScore } from '../counterpoint/model';
import { classifyIntervalSemitones } from './consonance';
import { intervalInfo } from './interval';
import { modeDegreeToPc } from './mode';

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
  const outerVoices = [...voices].sort((a, b) => {
    const avgA = a.notes.reduce((sum, note) => sum + note.midi, 0) / a.notes.length;
    const avgB = b.notes.reduce((sum, note) => sum + note.midi, 0) / b.notes.length;
    return avgB - avgA;
  });
  const topVoice = outerVoices[0];
  const bottomVoice = outerVoices[outerVoices.length - 1];
  const topFinal = topVoice.notes.filter((note) => note.startTick + note.durationTicks === lastTick).at(-1)?.midi ?? topVoice.notes.at(-1)!.midi;
  const bottomFinal = bottomVoice.notes.filter((note) => note.startTick + note.durationTicks === lastTick).at(-1)?.midi ?? bottomVoice.notes.at(-1)!.midi;
  const finalInterval = intervalInfo(topFinal, bottomFinal, true);
  const finalConsonant = classifyIntervalSemitones(finalInterval.semitones, true) !== 'dissonant';
  const tonicPc = score.tonicPitchClass;
  const dominantPc = modeDegreeToPc(score.mode, tonicPc, 5);
  const topPc = topFinal % 12;
  const bottomPc = bottomFinal % 12;
  const tonicSupport = topPc === tonicPc || bottomPc === tonicPc;
  const family =
    finalConsonant && tonicSupport
      ? (topPc === tonicPc && bottomPc === tonicPc) || finalInterval.intervalClass === 0 || finalInterval.intervalClass === 7
        ? 'strong'
        : topPc === dominantPc || bottomPc === dominantPc
          ? 'acceptable'
          : 'weak'
      : 'invalid';
  const quality = family === 'invalid' ? 'invalid' : family;
  return {
    detected: quality !== 'invalid',
    startTick: penultTick,
    endTick: lastTick,
    quality,
    explanation:
      quality === 'strong'
        ? 'Final sonority is consonant, tonic-supported, and stable.'
        : quality === 'acceptable'
          ? 'Final sonority is consonant and tonic-supported, though not the strongest cadence shape.'
          : quality === 'weak'
            ? 'Final sonority is consonant but only weakly cadential.'
            : 'The final sonority is dissonant or unstable.'
  };
}
