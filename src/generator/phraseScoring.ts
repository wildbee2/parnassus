import { classifyIntervalSemitones } from '../music/consonance';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, Voice } from '../counterpoint/model';

export interface CandidateScoreContext {
  score: CounterpointScore;
  voice: Voice;
  midi: number;
  previousMidi?: number;
  cfMidi?: number;
  tick: number;
}

export const STYLE_WEIGHTS = {
  stepMotionReward: 2,
  contraryMotionReward: 2,
  imperfectConsonanceReward: 1.5,
  repeatedIntervalPenalty: 2,
  repeatedPatternPenalty: 1.5,
  largeLeapPenalty: 2,
  contourPenalty: 1,
  climaxPenalty: 1,
  perfectConsonancePenalty: 0.8,
  similarMotionPenalty: 0.6,
  rangeEdgePenalty: 0.5
};

export function scoreCandidate(context: CandidateScoreContext): number {
  const { score, voice, midi, previousMidi, cfMidi, tick } = context;
  let value = 0;
  if (previousMidi !== undefined) {
    const diff = midi - previousMidi;
    const abs = Math.abs(diff);
    if (abs <= 2) value += STYLE_WEIGHTS.stepMotionReward;
    if (abs > 7) value -= STYLE_WEIGHTS.largeLeapPenalty * 2;
    else if (abs > 4) value -= STYLE_WEIGHTS.largeLeapPenalty;
    if (diff === 0) value -= STYLE_WEIGHTS.repeatedPatternPenalty;
  }
  if (cfMidi !== undefined) {
    const interval = classifyIntervalSemitones(midi - cfMidi, true);
    if (interval === 'imperfect') value += STYLE_WEIGHTS.imperfectConsonanceReward;
    if (interval === 'perfect') value -= STYLE_WEIGHTS.perfectConsonancePenalty;
  }
  const edgeDistance = Math.min(midi - voice.rangeMinMidi, voice.rangeMaxMidi - midi);
  if (edgeDistance <= 2) value -= STYLE_WEIGHTS.rangeEdgePenalty;
  const endFinal = tick + score.ticksPerWhole >= Math.max(...score.voices.flatMap((v) => v.notes.map((n) => n.startTick + n.durationTicks)), score.ticksPerWhole);
  if (endFinal && midiToPitchClass(midi) !== score.tonicPitchClass) value -= 5;
  return value;
}

