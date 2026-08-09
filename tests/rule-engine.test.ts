import { describe, expect, test } from 'vitest';
import { classifyIntervalSemitones } from '../src/music/consonance';
import { intervalInfo } from '../src/music/interval';
import { classifyMotion, isHiddenPerfect } from '../src/music/motion';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import type { CounterpointScore } from '../src/counterpoint/model';

function baseScore(): CounterpointScore {
  return {
    id: 'test',
    title: 'Test',
    tonicPitchClass: 2,
    mode: 'dorian',
    ticksPerWhole: 480,
    tempoBpm: 96,
    voices: [
      {
        id: 'cf',
        name: 'CF',
        role: 'cantus',
        rangeMinMidi: 48,
        rangeMaxMidi: 67,
        notes: [
          { id: 'cf-0', midi: 50, startTick: 0, durationTicks: 480 },
          { id: 'cf-1', midi: 52, startTick: 480, durationTicks: 480 },
          { id: 'cf-2', midi: 53, startTick: 960, durationTicks: 480 },
          { id: 'cf-3', midi: 50, startTick: 1440, durationTicks: 480 }
        ]
      },
      {
        id: 'cp',
        name: 'CP',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 55,
        rangeMaxMidi: 76,
        notes: [
          { id: 'cp-0', midi: 62, startTick: 0, durationTicks: 480 },
          { id: 'cp-1', midi: 64, startTick: 480, durationTicks: 480 },
          { id: 'cp-2', midi: 65, startTick: 960, durationTicks: 480 },
          { id: 'cp-3', midi: 62, startTick: 1440, durationTicks: 480 }
        ]
      }
    ]
  };
}

describe('intervals', () => {
  const cases = [
    [0, 'perfect'],
    [7, 'perfect'],
    [12, 'perfect'],
    [3, 'imperfect'],
    [4, 'imperfect'],
    [8, 'imperfect'],
    [9, 'imperfect'],
    [1, 'dissonant'],
    [2, 'dissonant'],
    [5, 'dissonant'],
    [6, 'dissonant'],
    [-7, 'perfect'],
    [-12, 'perfect'],
    [-3, 'imperfect'],
    [-4, 'imperfect'],
    [-2, 'dissonant'],
    [-5, 'dissonant'],
    [19, 'perfect'],
    [24, 'perfect'],
    [31, 'perfect']
  ] as const;

  test.each(cases)('classify semitones %i', (value, expected) => {
    expect(classifyIntervalSemitones(value)).toBe(expected);
  });

  const intervalCases = [
    [60, 67, 7],
    [60, 72, 12],
    [64, 60, -4],
    [55, 62, 7],
    [60, 61, 1],
    [60, 74, 14],
    [48, 60, 12],
    [50, 57, 7],
    [50, 62, 12],
    [67, 60, -7]
  ] as const;

  test.each(intervalCases)('interval info %i -> %i', (a, b, semitones) => {
    expect(intervalInfo(a, b).semitones).toBe(semitones);
  });

  const additionalIntervalCases = [
    [60, 63, 'imperfect'],
    [60, 64, 'imperfect'],
    [60, 65, 'dissonant'],
    [60, 66, 'dissonant'],
    [60, 67, 'perfect'],
    [60, 68, 'imperfect'],
    [60, 69, 'imperfect'],
    [60, 70, 'dissonant'],
    [60, 71, 'dissonant'],
    [60, 72, 'perfect'],
    [60, 75, 'imperfect'],
    [60, 76, 'imperfect']
  ] as const;

  test.each(additionalIntervalCases)('more interval classification %i -> %i', (a, b, expected) => {
    expect(classifyIntervalSemitones(b - a)).toBe(expected);
  });
});

describe('motion', () => {
  const cases = [
    [60, 62, 67, 69, 'parallel'],
    [60, 62, 67, 65, 'contrary'],
    [60, 60, 67, 67, 'static'],
    [60, 60, 67, 69, 'oblique'],
    [60, 64, 67, 71, 'parallel'],
    [60, 62, 67, 67, 'oblique'],
    [60, 63, 67, 70, 'parallel'],
    [60, 61, 67, 66, 'contrary'],
    [60, 64, 67, 67, 'oblique'],
    [60, 62, 67, 68, 'similar']
  ] as const;

  test.each(cases)('classify motion %i %i %i %i', (a1, a2, b1, b2, expected) => {
    expect(classifyMotion(a1, a2, b1, b2).type).toBe(expected);
  });

  const hiddenCases = [
    [60, 64, 67, 71, true],
    [60, 61, 67, 74, false],
    [60, 64, 67, 74, false],
    [60, 63, 67, 75, true],
    [60, 60, 67, 74, false],
    [60, 65, 67, 74, false]
  ] as const;

  test.each(hiddenCases)('hidden perfect %i %i %i %i', (a1, a2, b1, b2, expected) => {
    expect(isHiddenPerfect(a1, a2, b1, b2)).toBe(expected);
  });

  const additionalMotionCases = [
    [60, 61, 67, 68, 'parallel'],
    [60, 62, 67, 66, 'contrary'],
    [60, 63, 67, 67, 'oblique'],
    [60, 65, 67, 69, 'similar'],
    [60, 62, 67, 70, 'similar'],
    [60, 60, 67, 70, 'oblique'],
    [60, 61, 67, 67, 'oblique'],
    [60, 64, 67, 72, 'similar'],
    [60, 65, 67, 64, 'contrary'],
    [60, 63, 67, 68, 'similar'],
    [60, 67, 67, 67, 'oblique'],
    [60, 62, 67, 72, 'similar']
  ] as const;

  test.each(additionalMotionCases)('more motion %i %i %i %i', (a1, a2, b1, b2, expected) => {
    expect(classifyMotion(a1, a2, b1, b2).type).toBe(expected);
  });
});

describe('evaluation', () => {
  test('legal first species example has no fatal violations', () => {
    const result = evaluateCounterpoint(baseScore());
    expect(result.violations.some((violation) => violation.severity === 'fatal')).toBe(false);
  });

  test('parallel fifth example is detected', () => {
    const score = baseScore();
    score.voices[1].notes = [
      { id: 'cp-0', midi: 57, startTick: 0, durationTicks: 480 },
      { id: 'cp-1', midi: 59, startTick: 480, durationTicks: 480 },
      { id: 'cp-2', midi: 60, startTick: 960, durationTicks: 480 },
      { id: 'cp-3', midi: 62, startTick: 1440, durationTicks: 480 }
    ];
    const result = evaluateCounterpoint(score);
    expect(result.violations.map((violation) => violation.ruleId)).toContain('HAR_PARALLEL_5');
  });

  test('voice crossing is detected', () => {
    const score = baseScore();
    score.voices[1].notes[0].midi = 40;
    const result = evaluateCounterpoint(score);
    expect(result.violations.map((violation) => violation.ruleId)).toContain('HAR_VOICE_CROSSING');
  });

  test('range violation is detected', () => {
    const score = baseScore();
    score.voices[1].notes[0].midi = 90;
    const result = evaluateCounterpoint(score);
    expect(result.violations.map((violation) => violation.ruleId)).toContain('MEL_RANGE');
  });
});
