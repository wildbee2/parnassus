import readline from 'node:readline';
import { canonicalExamples } from '../src/examples/builtInExamples';
import { generateCantusFirmus } from '../src/generator/cantusGenerator';
import { generateVoice } from '../src/generator/voiceGenerator';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import type { CounterpointScore, Species } from '../src/counterpoint/model';
import type { ModeName } from '../src/music/mode';

type GenerateRequest = {
  id: string;
  mode: ModeName;
  tonicPitchClass: number;
  length: number;
  seed: number;
  strictness: 'strict' | 'balanced' | 'permissive';
  heuristicMode: 'strict' | 'humanLike';
  cfRangeMinMidi: number;
  cfRangeMaxMidi: number;
  counterpointVoices: number;
  cpSpecies: Species[];
};

type Request =
  | { type: 'examples' }
  | { type: 'generate'; payload: GenerateRequest }
  | { type: 'evaluate'; payload: CounterpointScore };

function buildScore(request: GenerateRequest): CounterpointScore {
  const cf = generateCantusFirmus({
    mode: request.mode,
    tonicPitchClass: request.tonicPitchClass,
    length: request.length,
    rangeMinMidi: request.cfRangeMinMidi,
    rangeMaxMidi: request.cfRangeMaxMidi,
    seed: request.seed
  });

  const counterpointVoices = Array.from({ length: request.counterpointVoices }, (_, index) => ({
    id: `cp${index + 1}`,
    name: `Counterpoint ${index + 1}`,
    role: 'counterpoint' as const,
    species: request.cpSpecies[index] ?? request.cpSpecies.at(-1) ?? 'first',
    rangeMinMidi: index === 0 ? 55 : 48,
    rangeMaxMidi: index === 0 ? 76 : 67,
    position: index === 0 ? 'above' as const : 'below' as const,
    notes: []
  }));

  return {
    id: `sim-${request.id}`,
    title: `Simulation ${request.mode} ${request.length}`,
    tonicPitchClass: request.tonicPitchClass,
    mode: request.mode,
    ticksPerWhole: 480,
    tempoBpm: 96,
    seed: request.seed,
    voices: [
      cf,
      ...counterpointVoices
    ]
  };
}

function totalNotes(score: CounterpointScore): number {
  return score.voices.reduce((sum, voice) => sum + voice.notes.length, 0);
}

function endTick(score: CounterpointScore): number {
  return Math.max(...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)), 0);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line) as Request;
    if (request.type === 'examples') {
      process.stdout.write(`${JSON.stringify({
        ok: true,
        examples: canonicalExamples.map((score) => ({
          score,
          evaluation: evaluateCounterpoint(score),
          totalNotes: totalNotes(score),
          endTick: endTick(score)
        }))
      })}\n`);
      return;
    }
    if (request.type === 'evaluate') {
      const evaluation = evaluateCounterpoint(request.payload);
      process.stdout.write(`${JSON.stringify({ ok: true, evaluation })}\n`);
      return;
    }

  const baseScore = buildScore(request.payload);
  const counterpointIds = baseScore.voices.filter((voice) => voice.role === 'counterpoint').map((voice) => voice.id);
  const voiceOrders = counterpointIds.length <= 1 ? [counterpointIds] : [counterpointIds, [...counterpointIds].reverse()];
  let bestScore = baseScore;
  let bestEvaluation = evaluateCounterpoint(baseScore, request.payload.heuristicMode);

  for (let orderIndex = 0; orderIndex < voiceOrders.length; orderIndex += 1) {
    const voiceOrder = voiceOrders[orderIndex];
    for (let variant = 0; variant < 8; variant += 1) {
      let score = baseScore;
      for (let voiceIndex = 0; voiceIndex < voiceOrder.length; voiceIndex += 1) {
        const voiceId = voiceOrder[voiceIndex];
        const voice = score.voices.find((candidate) => candidate.id === voiceId);
        if (!voice) continue;
        const generatedVoice = generateVoice({
          score,
          voice,
          seed: request.payload.seed + orderIndex * 1000 + variant * 211 + (voiceIndex + 1) * 97,
          heuristicMode: request.payload.heuristicMode
        });
        score = {
          ...score,
          voices: score.voices.map((existing) => (existing.id === voice.id ? generatedVoice : existing))
        };
      }

      const evaluation = evaluateCounterpoint(score, request.payload.heuristicMode);
      if (evaluation.violations.length < bestEvaluation.violations.length) {
        bestScore = score;
        bestEvaluation = evaluation;
      }
      if (evaluation.violations.length === 0) {
        process.stdout.write(`${JSON.stringify({
          ok: true,
          score,
          evaluation,
          totalNotes: totalNotes(score),
          endTick: endTick(score)
        })}\n`);
        return;
      }
    }
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    score: bestScore,
    evaluation: bestEvaluation,
    totalNotes: totalNotes(bestScore),
    endTick: endTick(bestScore)
  })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' })}\n`);
  }
});
