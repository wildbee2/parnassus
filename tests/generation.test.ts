import { describe, expect, test } from 'vitest';
import { generateCantusFirmus } from '../src/generator/cantusGenerator';
import { generateVoice } from '../src/generator/voiceGenerator';
import { scoreCandidate } from '../src/generator/phraseScoring';
import { detectHarmonizingSchemaOccurrences } from '../src/generator/harmonizingSchemas';
import { generateCounterpointScore } from '../src/generator';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import type { CounterpointScore } from '../src/counterpoint/model';
import { voiceEndTick } from '../src/counterpoint/species';
import { resolveCounterpointSettings } from '../src/counterpoint/settings';

function baseGenerateScore(): CounterpointScore {
  return {
    id: 'gen',
    title: 'Generation',
    tonicPitchClass: 2,
    mode: 'dorian',
    ticksPerWhole: 480,
    tempoBpm: 96,
    seed: 42,
    voices: [
      generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 8, rangeMinMidi: 48, rangeMaxMidi: 67, seed: 42 }),
      { id: 'cp1', name: 'CP1', role: 'counterpoint', species: 'first', rangeMinMidi: 55, rangeMaxMidi: 76, position: 'above', notes: [] }
    ]
  };
}

function romanescaLikeScore(): CounterpointScore {
  return {
    id: 'romanesca',
    title: 'Romanesca',
    tonicPitchClass: 0,
    mode: 'ionian',
    ticksPerWhole: 480,
    tempoBpm: 96,
    voices: [
      {
        id: 'cf',
        name: 'Bass',
        role: 'cantus',
        rangeMinMidi: 43,
        rangeMaxMidi: 55,
        notes: [
          { id: 'cf-0', midi: 48, startTick: 0, durationTicks: 480 },
          { id: 'cf-1', midi: 47, startTick: 480, durationTicks: 480 },
          { id: 'cf-2', midi: 45, startTick: 960, durationTicks: 480 },
          { id: 'cf-3', midi: 43, startTick: 1440, durationTicks: 480 }
        ]
      },
      {
        id: 'cp1',
        name: 'CP1',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 48,
        rangeMaxMidi: 76,
        position: 'above',
        notes: [
          { id: 'cp1-0', midi: 52, startTick: 0, durationTicks: 480 },
          { id: 'cp1-1', midi: 56, startTick: 480, durationTicks: 480 },
          { id: 'cp1-2', midi: 48, startTick: 960, durationTicks: 480 }
        ]
      }
    ]
  };
}

function prinnerLikeScore(): CounterpointScore {
  return {
    id: 'prinner',
    title: 'Prinner',
    tonicPitchClass: 0,
    mode: 'ionian',
    ticksPerWhole: 480,
    tempoBpm: 96,
    voices: [
      {
        id: 'cf',
        name: 'Bass',
        role: 'cantus',
        rangeMinMidi: 55,
        rangeMaxMidi: 67,
        notes: [
          { id: 'cf-0', midi: 65, startTick: 0, durationTicks: 480 },
          { id: 'cf-1', midi: 64, startTick: 480, durationTicks: 480 },
          { id: 'cf-2', midi: 62, startTick: 960, durationTicks: 480 },
          { id: 'cf-3', midi: 60, startTick: 1440, durationTicks: 480 }
        ]
      },
      {
        id: 'cp1',
        name: 'CP1',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 60,
        rangeMaxMidi: 81,
        position: 'above',
        notes: [
          { id: 'cp1-0', midi: 69, startTick: 0, durationTicks: 480 },
          { id: 'cp1-1', midi: 67, startTick: 480, durationTicks: 480 },
          { id: 'cp1-2', midi: 65, startTick: 960, durationTicks: 480 }
        ]
      }
    ]
  };
}

describe('generation', () => {
  test('cantus firmus is deterministic by seed', () => {
    const a = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 8, rangeMinMidi: 48, rangeMaxMidi: 67, seed: 100 });
    const b = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 8, rangeMinMidi: 48, rangeMaxMidi: 67, seed: 100 });
    expect(a.notes.map((note) => note.midi)).toEqual(b.notes.map((note) => note.midi));
  });

  test('generated cantus stays in range', () => {
    const cf = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 10, rangeMinMidi: 48, rangeMaxMidi: 67, seed: 10 });
    expect(cf.notes.every((note) => note.midi >= 48 && note.midi <= 67)).toBe(true);
  });

  test('generator returns a score', () => {
    const result = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    expect(result.score.voices.length).toBeGreaterThanOrEqual(2);
  });

  test('generated score evaluates', () => {
    const result = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    expect(typeof result.evaluation.score).toBe('number');
  });

  test('generation is deterministic by seed', () => {
    const a = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    const b = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    expect(a.score.voices[0].notes.map((note) => note.midi)).toEqual(b.score.voices[0].notes.map((note) => note.midi));
  });

  test.each([2, 3, 4])('voice count handling placeholder %i', (count) => {
    const score = baseGenerateScore();
    while (score.voices.length < count) {
      score.voices.push({ id: `cp${score.voices.length}`, name: `CP${score.voices.length}`, role: 'counterpoint', species: 'first', rangeMinMidi: 48, rangeMaxMidi: 76, notes: [] });
    }
    const result = generateCounterpointScore({ score, options: { beamWidth: 20, maxBacktracks: 40, seed: 40 + count, strictness: 'balanced' } });
    expect(result.score.voices.length).toBe(count);
  });

  test('strict generated output is evaluatable', () => {
    const result = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    const evaluation = evaluateCounterpoint(result.score);
    expect(evaluation.score).toBeGreaterThanOrEqual(0);
  });

  test('every generated note is inside its range', () => {
    const result = generateCounterpointScore({ score: baseGenerateScore(), options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict' } });
    for (const voice of result.score.voices) {
      for (const note of voice.notes) {
        expect(note.midi).toBeGreaterThanOrEqual(voice.rangeMinMidi);
        expect(note.midi).toBeLessThanOrEqual(voice.rangeMaxMidi);
      }
    }
  });

  test('generated voices span the full score length', () => {
    const score = baseGenerateScore();
    const voice = generateVoice({ score, voice: score.voices[1], seed: 44, heuristicMode: 'humanLike' });
    expect(voiceEndTick(voice)).toBe(voiceEndTick(score.voices[0]));
  });

  test('harmonizing settings are accepted and bias toward thirds and sixths', () => {
    const resolved = resolveCounterpointSettings('harmonizing');
    expect(resolved.heuristicMode).toBe('harmonizing');
    expect(resolved.allowAccentedPassingDissonance).toBe(true);
    expect(resolved.permitMoreThanThreeThirds).toBe(true);
    expect(resolved.permitMoreThanThreeSixths).toBe(true);

    const score = baseGenerateScore();
    const thirdish = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 54,
      previousMidi: 62,
      cfMidi: 50,
      tick: 0,
      generationStyle: 'harmonizing'
    });
    const perfectish = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 57,
      previousMidi: 62,
      cfMidi: 50,
      tick: 0,
      generationStyle: 'harmonizing'
    });

    expect(thirdish).toBeGreaterThan(perfectish);
    expect(evaluateCounterpoint(score, 'harmonizing').profileName).toContain('Harmonizing');
  });

  test('harmonizing rewards a stepwise Romanesca-like pattern', () => {
    const score = romanescaLikeScore();
    const sixth = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 52,
      previousMidi: 48,
      cfMidi: 43,
      tick: 1440,
      generationStyle: 'harmonizing'
    });
    const fifth = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 50,
      previousMidi: 48,
      cfMidi: 43,
      tick: 1440,
      generationStyle: 'harmonizing'
    });

    expect(sixth).toBeGreaterThan(fifth);
  });

  test('harmonizing rewards a Prinner-like parallel descent', () => {
    const score = prinnerLikeScore();
    const stepwise = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 64,
      previousMidi: 65,
      cfMidi: 60,
      tick: 1440,
      generationStyle: 'harmonizing'
    });
    const staticFifth = scoreCandidate({
      score,
      voice: score.voices[1],
      midi: 67,
      previousMidi: 65,
      cfMidi: 60,
      tick: 1440,
      generationStyle: 'harmonizing'
    });

    expect(stepwise).toBeGreaterThan(staticFifth);
  });

  test('harmonizing generation uses a single schema-guided pass', () => {
    const result = generateCounterpointScore({
      score: baseGenerateScore(),
      options: { beamWidth: 20, maxBacktracks: 40, seed: 42, strictness: 'strict', heuristicMode: 'harmonizing' }
    });

    expect(result.candidates.length).toBe(1);
  });

  test('schema annotations are detected on the score timeline', () => {
    const score = romanescaLikeScore();
    const annotations = detectHarmonizingSchemaOccurrences(score);
    expect(annotations.some((annotation) => annotation.label === 'Romanesca')).toBe(true);
    expect(annotations.some((annotation) => annotation.startTick === 0)).toBe(true);
  });
});
