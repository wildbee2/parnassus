import { generateCantusFirmus } from './cantusGenerator';
import { generateVoice } from './voiceGenerator';
import type { CounterpointScore, GeneratedResult, GenerateRequest, Voice } from '../counterpoint/model';
import { evaluateCounterpoint } from '../counterpoint/evaluator';

function cloneScore(score: CounterpointScore): CounterpointScore {
  return structuredClone(score);
}

function orderVoiceGeneration(voices: Voice[]): Voice[] {
  return [...voices].filter((voice) => voice.role !== 'cantus').sort((a, b) => {
    if (a.position === b.position) return a.name.localeCompare(b.name);
    if (a.position === 'above') return -1;
    if (b.position === 'above') return 1;
    return 0;
  });
}

function violationSummary(score: CounterpointScore): {
  fatal: number;
  error: number;
  warning: number;
  total: number;
} {
  const result = evaluateCounterpoint(score);
  return {
    fatal: result.violations.filter((violation) => violation.severity === 'fatal').length,
    error: result.violations.filter((violation) => violation.severity === 'error').length,
    warning: result.violations.filter((violation) => violation.severity === 'warning').length,
    total: result.violations.length
  };
}

function betterThan(a: ReturnType<typeof violationSummary>, b: ReturnType<typeof violationSummary>): boolean {
  if (a.fatal !== b.fatal) return a.fatal < b.fatal;
  if (a.error !== b.error) return a.error < b.error;
  if (a.warning !== b.warning) return a.warning < b.warning;
  return a.total < b.total;
}

function populateScore(base: CounterpointScore, seed: number, strictness: GenerateRequest['options']['strictness']): CounterpointScore {
  const score = cloneScore(base);
  const cf = score.voices.find((voice) => voice.role === 'cantus') ?? score.voices[0];
  if (cf.notes.length === 0) {
    const generatedCf = generateCantusFirmus({
      mode: score.mode,
      tonicPitchClass: score.tonicPitchClass,
      length: 10,
      rangeMinMidi: cf.rangeMinMidi,
      rangeMaxMidi: cf.rangeMaxMidi,
      seed
    });
    score.voices = [generatedCf, ...score.voices.filter((voice) => voice.id !== generatedCf.id)];
  }
  const voices = orderVoiceGeneration(score.voices);
  for (let index = 0; index < voices.length; index += 1) {
    const voice = voices[index];
    if (voice.role === 'cantus' || voice.notes.length > 0) continue;
    const attempts = strictness === 'strict' ? 18 : strictness === 'balanced' ? 12 : 8;
    let bestScore: CounterpointScore | null = null;
    let bestSummary: ReturnType<typeof violationSummary> | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const generated = generateVoice({ score, voice, seed: seed + index * 97 + attempt * 13 });
      const updated = cloneScore(score);
      updated.voices = updated.voices.map((existing) => (existing.id === voice.id ? generated : existing));
      const summary = violationSummary(updated);
      if (!bestSummary || betterThan(summary, bestSummary)) {
        bestSummary = summary;
        bestScore = updated;
      }
      if (summary.fatal === 0 && summary.error === 0) {
        break;
      }
    }
    if (bestScore) {
      score.voices = bestScore.voices;
    }
  }
  return score;
}

export function generateCounterpointScore(request: GenerateRequest): GeneratedResult {
  const maxAttempts = request.options.strictness === 'strict' ? Math.max(120, request.options.maxBacktracks * 3) : request.options.strictness === 'balanced' ? Math.max(60, request.options.maxBacktracks * 2) : Math.max(30, request.options.maxBacktracks);
  let bestScore: CounterpointScore | null = null;
  let bestSummary: ReturnType<typeof violationSummary> | null = null;
  let zeroViolationScore: CounterpointScore | null = null;
  let zeroViolationEvaluation: ReturnType<typeof evaluateCounterpoint> | null = null;
  const candidates: CounterpointScore[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidateSeed = request.options.seed + attempt * 7919;
    const score = populateScore(request.score, candidateSeed, request.options.strictness);
    const evaluation = evaluateCounterpoint(score);
    const summary = {
      fatal: evaluation.violations.filter((violation) => violation.severity === 'fatal').length,
      error: evaluation.violations.filter((violation) => violation.severity === 'error').length,
      warning: evaluation.violations.filter((violation) => violation.severity === 'warning').length,
      total: evaluation.violations.length
    };
    candidates.push(score);
    if (summary.total === 0) {
      zeroViolationScore = score;
      zeroViolationEvaluation = evaluation;
      break;
    }
    if (!bestSummary || betterThan(summary, bestSummary)) {
      bestSummary = summary;
      bestScore = score;
    }
  }

  const chosenScore = zeroViolationScore ?? bestScore ?? populateScore(request.score, request.options.seed, request.options.strictness);
  const evaluation = zeroViolationEvaluation ?? evaluateCounterpoint(chosenScore);
  return {
    score: chosenScore,
    evaluation,
    candidates: candidates.length ? candidates.slice(0, 5) : [chosenScore],
    message: evaluation.violations.length
      ? zeroViolationScore
        ? 'Generation completed successfully with zero violations.'
        : 'No zero-violation solution was found under the current constraints.'
      : 'Generation completed successfully with zero violations.'
  };
}
