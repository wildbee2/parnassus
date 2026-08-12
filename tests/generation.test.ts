import { describe, expect, test } from 'vitest';
import { generateCantusFirmus } from '../src/generator/cantusGenerator';
import { generateVoice } from '../src/generator/voiceGenerator';
import { generateCounterpointScore } from '../src/generator';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import type { CounterpointScore } from '../src/counterpoint/model';
import { voiceEndTick } from '../src/counterpoint/species';

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
});
