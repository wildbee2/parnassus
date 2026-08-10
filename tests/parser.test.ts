import { describe, expect, test } from 'vitest';
import { parseScoreText } from '../src/counterpoint/parser';
import type { CounterpointScore } from '../src/counterpoint/model';

function makeBaseScore(): CounterpointScore {
  return {
    id: 'parser-test',
    title: 'Parser Test',
    tonicPitchClass: 0,
    mode: 'ionian',
    ticksPerWhole: 480,
    tempoBpm: 96,
    voices: [
      {
        id: 'cf',
        name: 'CF',
        role: 'cantus',
        rangeMinMidi: 48,
        rangeMaxMidi: 60,
        notes: []
      },
      {
        id: 'cp1',
        name: 'CP1',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 60,
        rangeMaxMidi: 76,
        position: 'above',
        notes: []
      }
    ]
  };
}

describe('parser', () => {
  test('parses note durations and species labels', () => {
    const parsed = parseScoreText('CF: C4/2 D4/2\nCP1 (second): E4/4 F4/4 G4/2', makeBaseScore());
    expect(parsed.score.voices[0].notes[0].durationTicks).toBe(240);
    expect(parsed.score.voices[0].notes[1].durationTicks).toBe(240);
    expect(parsed.score.voices[1].species).toBe('second');
    expect(parsed.score.voices[1].notes[0].durationTicks).toBe(120);
    expect(parsed.score.voices[1].notes[2].durationTicks).toBe(240);
  });
});
