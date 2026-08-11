import { describe, expect, test } from 'vitest';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import { suggestNoteAddition } from '../src/counterpoint/suggestions';
import type { CounterpointScore } from '../src/counterpoint/model';
import { defaultScore } from '../src/store/useAppStore';

function violationSignature(violation: ReturnType<typeof evaluateCounterpoint>['violations'][number]): string {
  return [
    violation.ruleId,
    violation.category,
    violation.startTick,
    violation.endTick ?? '',
    violation.voiceIds.join(','),
    violation.noteIds?.join(',') ?? ''
  ].join('|');
}

function baseScore(): CounterpointScore {
  return {
    id: 'suggestion-test',
    title: 'Suggestion Test',
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
          { id: 'cf-1', midi: 52, startTick: 480, durationTicks: 480 }
        ]
      },
      {
        id: 'cp1',
        name: 'CP1',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 60,
        rangeMaxMidi: 76,
        notes: [
          { id: 'cp1-0', midi: 62, startTick: 0, durationTicks: 480 },
          { id: 'cp1-1', midi: 67, startTick: 480, durationTicks: 480 }
        ]
      },
      {
        id: 'cp2',
        name: 'CP2',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 55,
        rangeMaxMidi: 67,
        notes: [
          { id: 'cp2-0', midi: 59, startTick: 0, durationTicks: 480 }
        ]
      }
    ]
  };
}

function tiedScore(): CounterpointScore {
  return {
    id: 'tied-score',
    title: 'Tied Score',
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
        notes: [{ id: 'cf-0', midi: 50, startTick: 0, durationTicks: 480 }]
      },
      {
        id: 'cp',
        name: 'CP',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 55,
        rangeMaxMidi: 76,
        notes: [{ id: 'cp-0', midi: 57, startTick: 0, durationTicks: 480 }]
      }
    ]
  };
}

describe('suggestNoteAddition', () => {
  test('extends the shortest counterpoint voice with a species-correct note', () => {
    const score = baseScore();
    const baseline = evaluateCounterpoint(score);

    const nextScore = suggestNoteAddition(score, () => 0);
    expect(nextScore).not.toBeNull();
    expect(nextScore).not.toBe(score);

    const after = evaluateCounterpoint(nextScore!);
    const baselineViolations = new Set(baseline.violations.map(violationSignature));
    expect(after.violations.every((violation) => baselineViolations.has(violationSignature(violation)))).toBe(true);

    const targetVoice = nextScore?.voices.find((voice) => voice.id === 'cp2');
    expect(targetVoice).toBeDefined();
    expect(targetVoice?.notes.length).toBe(2);
    expect(targetVoice?.notes[1].startTick).toBe(480);
    expect(targetVoice?.notes[1].durationTicks).toBe(480);
  });

  test('produces a suggestion on the default evaluate score', () => {
    const nextScore = suggestNoteAddition(defaultScore(), () => 0);
    expect(nextScore).not.toBeNull();
    expect(nextScore?.voices.some((voice) => voice.role === 'counterpoint' && voice.notes.length > 0)).toBe(true);
  });

  test('can choose the cantus when voices are tied for shortest', () => {
    const nextScore = suggestNoteAddition(tiedScore(), () => 0);
    expect(nextScore).not.toBeNull();
    expect(nextScore?.voices.find((voice) => voice.id === 'cf')?.notes.length).toBe(2);
    expect(nextScore?.voices.find((voice) => voice.id === 'cp')?.notes.length).toBe(1);
  });
});
