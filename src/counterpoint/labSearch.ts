import { generateCantusFirmus } from '../generator/cantusGenerator';
import { SeededRandom } from '../generator/seededRandom';
import { suggestNoteAddition } from './suggestions';
import { evaluateCounterpoint } from './evaluator';
import { voiceEndTick } from './species';
import { makeVoice } from './parser';
import type { CounterpointScore, EvaluationResult, GenerationStyle, Species } from './model';
import type { InstrumentPreset } from '../music/instruments';
import type { ModeName } from '../music/mode';

export interface LabSearchOptions {
  totalVoices: number;
  species: Species[];
  bars: number;
  mode: ModeName;
  maxAttempts?: number;
  heuristicMode?: GenerationStyle;
  seed?: number;
  instruments?: InstrumentPreset[];
  onAttempt?: (attempt: number, maxAttempts: number) => void;
}

export interface LabSearchResult {
  score: CounterpointScore;
  evaluation: EvaluationResult;
  seed: number;
  attempts: number;
}

function clampVoiceCount(totalVoices: number): number {
  return Math.min(4, Math.max(2, totalVoices));
}

function buildCounterpointVoice(index: number, species: Species): ReturnType<typeof makeVoice> {
  const slots = [
    { position: 'above' as const, rangeMinMidi: 55, rangeMaxMidi: 76 },
    { position: 'below' as const, rangeMinMidi: 48, rangeMaxMidi: 67 },
    { position: 'auto' as const, rangeMinMidi: 50, rangeMaxMidi: 72 }
  ];
  const slot = slots[index] ?? slots[slots.length - 1];
  const voice = makeVoice(`cp${index + 1}`, `Counterpoint ${index + 1}`, 'counterpoint', species, slot.rangeMinMidi, slot.rangeMaxMidi);
  voice.position = slot.position;
  return voice;
}

function buildScoreFromSeed(options: LabSearchOptions, seed: number): CounterpointScore {
  const rng = new SeededRandom(seed);
  const totalVoices = clampVoiceCount(options.totalVoices);
  const counterpointCount = Math.max(1, totalVoices - 1);
  const tonicPitchClass = rng.int(12);
  const cantusRangeMinMidi = 48 + rng.int(4);
  const cantusRangeMaxMidi = cantusRangeMinMidi + 19;
  const climaxPosition = Math.max(1, Math.min(options.bars - 2, Math.floor(options.bars * (0.3 + rng.next() * 0.3))));
  const cantus = generateCantusFirmus({
    mode: options.mode,
    tonicPitchClass,
    length: options.bars,
    rangeMinMidi: cantusRangeMinMidi,
    rangeMaxMidi: cantusRangeMaxMidi,
    seed,
    climaxPosition
  });
  cantus.instrument = options.instruments?.[0] ?? 'grand_piano';

  const voices = [cantus];
  for (let index = 0; index < counterpointCount; index += 1) {
    const species = options.species[index] ?? options.species.at(-1) ?? 'first';
    const voice = buildCounterpointVoice(index, species);
    voice.instrument = options.instruments?.[index + 1] ?? 'grand_piano';
    voices.push(voice);
  }

  return {
    id: `lab-${seed}`,
    title: `Lab ${options.mode} ${options.bars} bars`,
    tonicPitchClass,
    mode: options.mode,
    ticksPerWhole: 480,
    tempoBpm: 96,
    seed,
    voices
  };
}

function scoreIsComplete(score: CounterpointScore, bars: number): boolean {
  const targetEndTick = bars * score.ticksPerWhole;
  return score.voices.every((voice) => voiceEndTick(voice) >= targetEndTick);
}

export async function searchLabCounterpoint(options: LabSearchOptions): Promise<LabSearchResult | null> {
  const maxAttempts = options.maxAttempts ?? 1000;
  const heuristicMode = options.heuristicMode ?? 'humanLike';
  const runSeed = options.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const attemptRng = new SeededRandom(runSeed ^ 0x5f3759df);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    options.onAttempt?.(attempt, maxAttempts);
    const attemptSeed = runSeed + attemptRng.int(1_000_000_000) + attempt * 7919;
    let score = buildScoreFromSeed(options, attemptSeed);
    const suggestionRng = new SeededRandom(attemptSeed ^ 0x9e3779b9);
    const maxSteps = Math.max(64, options.bars * 32 * Math.max(1, options.totalVoices - 1));
    let steps = 0;

    while (!scoreIsComplete(score, options.bars) && steps < maxSteps) {
      const nextScore = suggestNoteAddition(score, () => suggestionRng.next(), heuristicMode);
      if (!nextScore) {
        break;
      }
      score = nextScore;
      steps += 1;
    }

    if (scoreIsComplete(score, options.bars)) {
      const evaluation = evaluateCounterpoint(score, heuristicMode);
      if (evaluation.violations.length === 0) {
        return { score, evaluation, seed: attemptSeed, attempts: attempt };
      }
    }

    if (attempt % 25 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return null;
}
