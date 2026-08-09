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

export function generateCounterpointScore(request: GenerateRequest): GeneratedResult {
  const score = cloneScore(request.score);
  const cf = score.voices.find((voice) => voice.role === 'cantus') ?? score.voices[0];
  if (cf.notes.length === 0) {
    const generatedCf = generateCantusFirmus({
      mode: score.mode,
      tonicPitchClass: score.tonicPitchClass,
      length: 10,
      rangeMinMidi: cf.rangeMinMidi,
      rangeMaxMidi: cf.rangeMaxMidi,
      seed: request.options.seed
    });
    score.voices = [generatedCf, ...score.voices.filter((voice) => voice.id !== generatedCf.id)];
  }
  const voices = orderVoiceGeneration(score.voices);
  const candidates: CounterpointScore[] = [];
  for (let index = 0; index < voices.length; index += 1) {
    const voice = voices[index];
    if (voice.role === 'cantus' || voice.notes.length > 0) continue;
    const generated = generateVoice({ score, voice, seed: request.options.seed + index * 17 });
    const updated = cloneScore(score);
    updated.voices = updated.voices.map((existing) => (existing.id === voice.id ? generated : existing));
    score.voices = updated.voices;
    candidates.push(updated);
  }
  const evaluation = evaluateCounterpoint(score);
  return {
    score,
    evaluation,
    candidates: candidates.length ? candidates.slice(0, 5) : [score],
    message: evaluation.violations.length ? 'Generation completed with warnings.' : 'Generation completed successfully.'
  };
}

