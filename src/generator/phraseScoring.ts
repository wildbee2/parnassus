import { classifyIntervalSemitones } from '../music/consonance';
import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, GenerationStyle, Voice } from '../counterpoint/model';

export interface CandidateScoreContext {
  score: CounterpointScore;
  voice: Voice;
  midi: number;
  previousMidi?: number;
  cfMidi?: number;
  tick: number;
  generationStyle?: GenerationStyle;
}

export const STYLE_WEIGHTS = {
  stepMotionReward: 2,
  contraryMotionReward: 2.75,
  imperfectConsonanceReward: 2.25,
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
  const { score, voice, midi, previousMidi, cfMidi, tick, generationStyle = 'strict' } = context;
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
  if (generationStyle === 'humanLike') {
    const center = (voice.rangeMinMidi + voice.rangeMaxMidi) / 2;
    const distanceFromCenter = Math.abs(midi - center);
    value -= distanceFromCenter / 6;

    if (previousMidi === undefined) {
      const intervalToTonic = cfMidi === undefined ? undefined : Math.abs(midi - cfMidi) % 12;
      if (intervalToTonic !== undefined) {
        if (intervalToTonic === 3 || intervalToTonic === 4 || intervalToTonic === 8 || intervalToTonic === 9) {
          value += 2.75;
        }
        if (intervalToTonic === 7 || intervalToTonic === 0) {
          value -= 1.25;
        }
      }
      if (midiToPitchClass(midi) === score.tonicPitchClass) {
        value += voice.role === 'counterpoint' ? 0.75 : 0.5;
      }
    }

    if (previousMidi !== undefined) {
      const diff = midi - previousMidi;
      const abs = Math.abs(diff);
      if (abs <= 1) value += 1.8;
      if (abs === 0) value += 0.5;
      if (abs <= 4) value += 0.5;
      if (cfMidi !== undefined) {
        const cfDiff = midi - cfMidi;
        if (Math.sign(diff) !== 0 && Math.sign(diff) !== Math.sign(cfDiff)) {
          value += STYLE_WEIGHTS.contraryMotionReward;
        }
      }
    }
    if (cfMidi !== undefined) {
      const interval = classifyIntervalSemitones(midi - cfMidi, true);
      if (interval === 'imperfect') value += STYLE_WEIGHTS.imperfectConsonanceReward;
      if (interval === 'perfect') value -= 1.1;
    }
    const finalTick = Math.max(...score.voices.flatMap((v) => v.notes.map((n) => n.startTick + n.durationTicks)), score.ticksPerWhole);
    const phraseProgress = finalTick > 0 ? tick / finalTick : 0;
    const dominantPc = modeDegreeToPc(score.mode, score.tonicPitchClass, 5);
    if (phraseProgress < 0.35 && midi >= center) value += 0.75;
    if (phraseProgress > 0.65 && midi <= center) value += 0.75;
    if (phraseProgress > 0.8 && midiToPitchClass(midi) === score.tonicPitchClass) value += 3;
    if (phraseProgress > 0.8 && midiToPitchClass(midi) === dominantPc) value += 1.5;
    if (phraseProgress > 0.8 && cfMidi !== undefined && classifyIntervalSemitones(midi - cfMidi, true) === 'imperfect') value += 1;
    if (phraseProgress > 0.85 && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) value += 1;
    if (tick <= score.ticksPerWhole && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) value += 1;
    if (tick <= score.ticksPerWhole && cfMidi !== undefined) {
      const openingInterval = Math.abs(midi - cfMidi) % 12;
      if (openingInterval === 3 || openingInterval === 4 || openingInterval === 8 || openingInterval === 9) value += 1.25;
      if (openingInterval === 7 || openingInterval === 0) value -= 0.75;
    }
    if (phraseProgress > 0.85 && previousMidi !== undefined && cfMidi !== undefined) {
      const cfMotion = Math.sign(cfMidi - (score.voices.find((v) => v.role === 'cantus')?.notes.find((n) => n.startTick === tick)?.midi ?? cfMidi));
      const voiceMotion = Math.sign(midi - previousMidi);
      if (voiceMotion !== 0 && cfMotion !== 0 && voiceMotion !== cfMotion) {
        value += 0.75;
      }
    }
  }
  return value;
}
