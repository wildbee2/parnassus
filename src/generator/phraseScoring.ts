import { classifyIntervalSemitones } from '../music/consonance';
import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, GenerationStyle, Voice } from '../counterpoint/model';
import type { CounterpointSettings } from '../counterpoint/settings';
import { defaultCounterpointSettings, isMinorMode, melodicMinorSixthPitchClass } from '../counterpoint/settings';
import { scoreHarmonizingSchemas } from './harmonizingSchemas';

export interface CandidateScoreContext {
  score: CounterpointScore;
  voice: Voice;
  midi: number;
  previousMidi?: number;
  cfMidi?: number;
  tick: number;
  generationStyle?: GenerationStyle;
  settings?: Partial<CounterpointSettings>;
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

function activeCantusNote(score: CounterpointScore, tick: number): import('../counterpoint/model').NoteEvent | undefined {
  const cantus = score.voices.find((voice) => voice.role === 'cantus');
  return cantus?.notes.find((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks) ?? cantus?.notes.at(-1);
}

function previousCantusNote(score: CounterpointScore, tick: number): import('../counterpoint/model').NoteEvent | undefined {
  const cantus = score.voices.find((voice) => voice.role === 'cantus');
  return cantus?.notes.filter((note) => note.startTick < tick).at(-1);
}

function harmonizingChromaticPitchClasses(score: CounterpointScore): {
  loweredSecond: number;
  raisedFourth: number;
  loweredSixth: number;
  raisedSeventh: number;
} {
  return {
    loweredSecond: (modeDegreeToPc(score.mode, score.tonicPitchClass, 2) + 11) % 12,
    raisedFourth: (modeDegreeToPc(score.mode, score.tonicPitchClass, 4) + 1) % 12,
    loweredSixth: (modeDegreeToPc(score.mode, score.tonicPitchClass, 6) + 11) % 12,
    raisedSeventh: (modeDegreeToPc(score.mode, score.tonicPitchClass, 7) + 1) % 12
  };
}

export function scoreCandidate(context: CandidateScoreContext): number {
  const { score, voice, midi, previousMidi, cfMidi, tick, generationStyle = 'strict' } = context;
  const settings = { ...defaultCounterpointSettings, ...(context.settings ?? {}) };
  let value = 0;
  if (previousMidi !== undefined) {
    const diff = midi - previousMidi;
    const abs = Math.abs(diff);
    if (abs <= 2) value += STYLE_WEIGHTS.stepMotionReward;
    if (abs > 7) value -= settings.permitOctaveLeap ? STYLE_WEIGHTS.largeLeapPenalty * 0.5 : STYLE_WEIGHTS.largeLeapPenalty * 2;
    else if (abs > 4) value -= settings.allowCambiata ? STYLE_WEIGHTS.largeLeapPenalty * 0.5 : STYLE_WEIGHTS.largeLeapPenalty;
    if (diff === 0) value += settings.permitRepeatedNotes ? 0.5 : -STYLE_WEIGHTS.repeatedPatternPenalty;
  }
  if (cfMidi !== undefined) {
    const interval = classifyIntervalSemitones(midi - cfMidi, true);
    if (interval === 'imperfect') value += STYLE_WEIGHTS.imperfectConsonanceReward;
    if (interval === 'perfect') value -= STYLE_WEIGHTS.perfectConsonancePenalty * (0.5 + settings.directPerfectStrictness);
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
      if (settings.allowCambiata && abs === 3) value += 0.75;
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
      if (interval === 'perfect') value -= 1.1 + settings.directPerfectStrictness;
    }
    if (settings.permitMelodicMinorSixth && isMinorMode(score.mode) && midiToPitchClass(midi) === melodicMinorSixthPitchClass(score.mode, score.tonicPitchClass)) {
      value += 0.6;
    }
    const finalTick = Math.max(...score.voices.flatMap((v) => v.notes.map((n) => n.startTick + n.durationTicks)), score.ticksPerWhole);
    const phraseProgress = finalTick > 0 ? tick / finalTick : 0;
    const dominantPc = modeDegreeToPc(score.mode, score.tonicPitchClass, 5);
    if (phraseProgress < 0.35 && midi >= center) value += 0.75;
    if (phraseProgress > 0.65 && midi <= center) value += 0.75;
    if (phraseProgress > 0.8 && midiToPitchClass(midi) === score.tonicPitchClass) value += 3;
    if (phraseProgress > 0.8 && midiToPitchClass(midi) === dominantPc) value += 1.5;
    if (phraseProgress > 0.8 && cfMidi !== undefined && classifyIntervalSemitones(midi - cfMidi, true) === 'imperfect') value += 1;
    if (phraseProgress > 0.8 && settings.cadenceStrictness > 0.7 && midiToPitchClass(midi) === score.tonicPitchClass) value += settings.cadenceStrictness * 1.5;
    if (phraseProgress > 0.85 && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) value += 1;
    if (tick <= score.ticksPerWhole && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) value += 1;
    if (tick <= score.ticksPerWhole && cfMidi !== undefined) {
      const openingInterval = Math.abs(midi - cfMidi) % 12;
      if (openingInterval === 3 || openingInterval === 4 || openingInterval === 8 || openingInterval === 9) value += 1.25;
      if (openingInterval === 7 || openingInterval === 0) value -= 0.75;
    }
    if (phraseProgress > 0.85 && previousMidi !== undefined && cfMidi !== undefined) {
      const currentCf = activeCantusNote(score, tick);
      const previousCf = previousCantusNote(score, tick);
      const cfMotion = currentCf && previousCf ? Math.sign(currentCf.midi - previousCf.midi) : 0;
      const voiceMotion = Math.sign(midi - previousMidi);
      if (voiceMotion !== 0 && cfMotion !== 0 && voiceMotion !== cfMotion) {
        value += 0.75;
      }
    }
  }
  if (generationStyle === 'harmonizing') {
    const center = (voice.rangeMinMidi + voice.rangeMaxMidi) / 2;
    const distanceFromCenter = Math.abs(midi - center);
    const finalTick = Math.max(...score.voices.flatMap((v) => v.notes.map((n) => n.startTick + n.durationTicks)), score.ticksPerWhole);
    const phraseProgress = finalTick > 0 ? tick / finalTick : 0;
    const intervalToCf = cfMidi === undefined ? undefined : Math.abs(midi - cfMidi) % 12;
    const isThirdOrSixth = intervalToCf === 3 || intervalToCf === 4 || intervalToCf === 8 || intervalToCf === 9;
    const isPerfect = intervalToCf === 0 || intervalToCf === 5 || intervalToCf === 7;
    const isDissonant = intervalToCf !== undefined && !isThirdOrSixth && !isPerfect;
    const chromatic = harmonizingChromaticPitchClasses(score);
    const pitchClass = midiToPitchClass(midi);
    const isCadentialChromatic =
      pitchClass === chromatic.loweredSecond ||
      pitchClass === chromatic.raisedFourth ||
      pitchClass === chromatic.loweredSixth ||
      pitchClass === chromatic.raisedSeventh;

    value -= distanceFromCenter / 10;
    if (previousMidi === undefined) {
      if (isThirdOrSixth) value += 4;
      if (isPerfect) value -= 1.5;
      if (isDissonant) value -= 4;
      if (isCadentialChromatic) value += 0.5;
    }
    if (previousMidi !== undefined) {
      const diff = midi - previousMidi;
      const abs = Math.abs(diff);
      if (abs <= 1) value += 1.25;
      if (abs <= 2) value += 0.75;
      if (abs > 7) value -= settings.permitOctaveLeap ? 1 : 3;
      if (cfMidi !== undefined && Math.sign(diff) !== 0) {
        const currentCf = activeCantusNote(score, tick);
        const previousCf = previousCantusNote(score, tick);
        const cfDiff = currentCf && previousCf ? currentCf.midi - previousCf.midi : 0;
        if (cfDiff !== 0 && Math.sign(diff) !== Math.sign(cfDiff)) {
          value += 2.25;
        }
      }
      if (isThirdOrSixth) value += 3.25;
      if (isPerfect) value -= 2;
      if (isDissonant) value -= 5;
      if (isCadentialChromatic && phraseProgress > 0.55) value += 2.25;
      if (cfMidi !== undefined) {
        const previousInterval = Math.abs(previousMidi - cfMidi) % 12;
        if ([3, 4, 8, 9].includes(previousInterval) && isThirdOrSixth && previousInterval !== intervalToCf) {
          value += 2.5;
        }
        if ([3, 4, 8, 9].includes(previousInterval) && isThirdOrSixth && previousInterval === intervalToCf) {
          value += 0.75;
        }
      }
    }
    if (phraseProgress < 0.25 && isThirdOrSixth) value += 1.5;
    if (phraseProgress > 0.7 && isThirdOrSixth) value += 1.75;
    if (phraseProgress > 0.7 && isCadentialChromatic) value += 1.5;
    if (phraseProgress > 0.8 && cfMidi !== undefined) {
      if (midiToPitchClass(midi) === score.tonicPitchClass) value += 3.5;
      if (midiToPitchClass(midi) === modeDegreeToPc(score.mode, score.tonicPitchClass, 5)) value += 1.5;
      if (pitchClass === chromatic.raisedSeventh) value += 1.5;
      if (pitchClass === chromatic.loweredSecond) value += 1.25;
      if (pitchClass === chromatic.raisedFourth || pitchClass === chromatic.loweredSixth) value += 1.5;
    }
    if (phraseProgress > 0.8 && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) value += 1;
    if (phraseProgress > 0.8 && cfMidi !== undefined && isThirdOrSixth) value += 1.25;
    if (phraseProgress > 0.85 && previousMidi !== undefined && cfMidi !== undefined) {
      const currentCf = activeCantusNote(score, tick);
      const previousCf = previousCantusNote(score, tick);
      const cfMotion = currentCf && previousCf ? Math.sign(currentCf.midi - previousCf.midi) : 0;
      const voiceMotion = Math.sign(midi - previousMidi);
      if (voiceMotion !== 0 && cfMotion !== 0 && voiceMotion !== cfMotion) {
        value += 1;
      }
    }
    if (phraseProgress > 0.6 && isCadentialChromatic && previousMidi !== undefined && Math.abs(midi - previousMidi) <= 2) {
      value += 1;
    }
    const schemaScore = scoreHarmonizingSchemas({
      score,
      tick,
      override: { voiceId: voice.id, midi }
    });
    value += schemaScore.bonus;
  }
  return value;
}
