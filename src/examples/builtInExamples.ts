import type { CounterpointScore } from '../counterpoint/model';
import { generateCantusFirmus } from '../generator/cantusGenerator';
import { defaultScore } from '../store/useAppStore';

function baseExample(title: string): CounterpointScore {
  const score = defaultScore();
  score.title = title;
  return score;
}

export const builtInExamples: CounterpointScore[] = [
  (() => {
    const score = baseExample('First Species Good 01');
    score.voices[0] = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 8, rangeMinMidi: 50, rangeMaxMidi: 67, seed: 11 });
    score.voices[1].species = 'first';
    score.voices[1].notes = [
      { id: 'n1', midi: 62, startTick: 0, durationTicks: 480 },
      { id: 'n2', midi: 64, startTick: 480, durationTicks: 480 },
      { id: 'n3', midi: 65, startTick: 960, durationTicks: 480 },
      { id: 'n4', midi: 67, startTick: 1440, durationTicks: 480 },
      { id: 'n5', midi: 65, startTick: 1920, durationTicks: 480 },
      { id: 'n6', midi: 64, startTick: 2400, durationTicks: 480 },
      { id: 'n7', midi: 62, startTick: 2880, durationTicks: 480 },
      { id: 'n8', midi: 62, startTick: 3360, durationTicks: 480 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('First Species Parallel Fifth');
    score.voices[0] = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 4, rangeMinMidi: 50, rangeMaxMidi: 65, seed: 12 });
    score.voices[1].species = 'first';
    score.voices[1].notes = [
      { id: 'n1', midi: 57, startTick: 0, durationTicks: 480 },
      { id: 'n2', midi: 59, startTick: 480, durationTicks: 480 },
      { id: 'n3', midi: 60, startTick: 960, durationTicks: 480 },
      { id: 'n4', midi: 62, startTick: 1440, durationTicks: 480 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Second Species Good 01');
    score.voices[0] = generateCantusFirmus({ mode: 'ionian', tonicPitchClass: 0, length: 4, rangeMinMidi: 48, rangeMaxMidi: 60, seed: 13 });
    score.voices[1].species = 'second';
    score.voices[1].notes = [
      { id: 'n1', midi: 67, startTick: 0, durationTicks: 240 },
      { id: 'n2', midi: 69, startTick: 240, durationTicks: 240 },
      { id: 'n3', midi: 69, startTick: 480, durationTicks: 240 },
      { id: 'n4', midi: 71, startTick: 720, durationTicks: 240 },
      { id: 'n5', midi: 72, startTick: 960, durationTicks: 240 },
      { id: 'n6', midi: 71, startTick: 1200, durationTicks: 240 },
      { id: 'n7', midi: 69, startTick: 1440, durationTicks: 240 },
      { id: 'n8', midi: 67, startTick: 1680, durationTicks: 240 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Second Species Bad Accented Dissonance');
    score.voices[0] = generateCantusFirmus({ mode: 'ionian', tonicPitchClass: 0, length: 4, rangeMinMidi: 48, rangeMaxMidi: 60, seed: 14 });
    score.voices[1].species = 'second';
    score.voices[1].notes = [
      { id: 'n1', midi: 61, startTick: 0, durationTicks: 240 },
      { id: 'n2', midi: 62, startTick: 240, durationTicks: 240 },
      { id: 'n3', midi: 63, startTick: 480, durationTicks: 240 },
      { id: 'n4', midi: 64, startTick: 720, durationTicks: 240 },
      { id: 'n5', midi: 65, startTick: 960, durationTicks: 240 },
      { id: 'n6', midi: 66, startTick: 1200, durationTicks: 240 },
      { id: 'n7', midi: 67, startTick: 1440, durationTicks: 240 },
      { id: 'n8', midi: 68, startTick: 1680, durationTicks: 240 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Third Species Good 01');
    score.voices[0] = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 4, rangeMinMidi: 50, rangeMaxMidi: 62, seed: 15 });
    score.voices[1].species = 'third';
    score.voices[1].notes = [
      { id: 'n1', midi: 67, startTick: 0, durationTicks: 120 },
      { id: 'n2', midi: 69, startTick: 120, durationTicks: 120 },
      { id: 'n3', midi: 71, startTick: 240, durationTicks: 120 },
      { id: 'n4', midi: 69, startTick: 360, durationTicks: 120 },
      { id: 'n5', midi: 70, startTick: 480, durationTicks: 120 },
      { id: 'n6', midi: 72, startTick: 600, durationTicks: 120 },
      { id: 'n7', midi: 71, startTick: 720, durationTicks: 120 },
      { id: 'n8', midi: 69, startTick: 840, durationTicks: 120 },
      { id: 'n9', midi: 67, startTick: 960, durationTicks: 120 },
      { id: 'n10', midi: 69, startTick: 1080, durationTicks: 120 },
      { id: 'n11', midi: 67, startTick: 1200, durationTicks: 120 },
      { id: 'n12', midi: 65, startTick: 1320, durationTicks: 120 },
      { id: 'n13', midi: 64, startTick: 1440, durationTicks: 120 },
      { id: 'n14', midi: 62, startTick: 1560, durationTicks: 120 },
      { id: 'n15', midi: 64, startTick: 1680, durationTicks: 120 },
      { id: 'n16', midi: 62, startTick: 1800, durationTicks: 120 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Third Species Illegal Dissonance');
    score.voices[0] = generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 4, rangeMinMidi: 50, rangeMaxMidi: 62, seed: 16 });
    score.voices[1].species = 'third';
    score.voices[1].notes = [
      { id: 'n1', midi: 67, startTick: 0, durationTicks: 120 },
      { id: 'n2', midi: 73, startTick: 120, durationTicks: 120 },
      { id: 'n3', midi: 68, startTick: 240, durationTicks: 120 },
      { id: 'n4', midi: 74, startTick: 360, durationTicks: 120 },
      { id: 'n5', midi: 75, startTick: 480, durationTicks: 120 },
      { id: 'n6', midi: 70, startTick: 600, durationTicks: 120 },
      { id: 'n7', midi: 72, startTick: 720, durationTicks: 120 },
      { id: 'n8', midi: 71, startTick: 840, durationTicks: 120 },
      { id: 'n9', midi: 73, startTick: 960, durationTicks: 120 },
      { id: 'n10', midi: 75, startTick: 1080, durationTicks: 120 },
      { id: 'n11', midi: 77, startTick: 1200, durationTicks: 120 },
      { id: 'n12', midi: 79, startTick: 1320, durationTicks: 120 },
      { id: 'n13', midi: 81, startTick: 1440, durationTicks: 120 },
      { id: 'n14', midi: 83, startTick: 1560, durationTicks: 120 },
      { id: 'n15', midi: 85, startTick: 1680, durationTicks: 120 },
      { id: 'n16', midi: 87, startTick: 1800, durationTicks: 120 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Fourth Species Good 43');
    score.voices[0] = generateCantusFirmus({ mode: 'phrygian', tonicPitchClass: 4, length: 6, rangeMinMidi: 50, rangeMaxMidi: 65, seed: 17 });
    score.voices[1].species = 'fourth';
    score.voices[1].notes = [
      { id: 'n1', midi: 67, startTick: 0, durationTicks: 480, tiedToNext: true },
      { id: 'n2', midi: 66, startTick: 480, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n3', midi: 67, startTick: 960, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n4', midi: 65, startTick: 1440, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n5', midi: 64, startTick: 1920, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n6', midi: 62, startTick: 2400, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Fourth Species Bad Unresolved');
    score.voices[0] = generateCantusFirmus({ mode: 'phrygian', tonicPitchClass: 4, length: 6, rangeMinMidi: 50, rangeMaxMidi: 65, seed: 18 });
    score.voices[1].species = 'fourth';
    score.voices[1].notes = [
      { id: 'n1', midi: 67, startTick: 0, durationTicks: 480, tiedToNext: true },
      { id: 'n2', midi: 69, startTick: 480, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n3', midi: 71, startTick: 960, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n4', midi: 72, startTick: 1440, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n5', midi: 74, startTick: 1920, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { id: 'n6', midi: 76, startTick: 2400, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Fifth Species Good 01');
    score.voices[0] = generateCantusFirmus({ mode: 'mixolydian', tonicPitchClass: 7, length: 6, rangeMinMidi: 50, rangeMaxMidi: 65, seed: 19 });
    score.voices[1].species = 'fifth';
    score.voices[1].notes = [
      { id: 'n1', midi: 74, startTick: 0, durationTicks: 240 },
      { id: 'n2', midi: 76, startTick: 240, durationTicks: 240 },
      { id: 'n3', midi: 77, startTick: 480, durationTicks: 120 },
      { id: 'n4', midi: 79, startTick: 600, durationTicks: 120 },
      { id: 'n5', midi: 77, startTick: 720, durationTicks: 240 },
      { id: 'n6', midi: 76, startTick: 960, durationTicks: 480 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Fifth Species Bad Dissonance');
    score.voices[0] = generateCantusFirmus({ mode: 'mixolydian', tonicPitchClass: 7, length: 6, rangeMinMidi: 50, rangeMaxMidi: 65, seed: 20 });
    score.voices[1].species = 'fifth';
    score.voices[1].notes = [
      { id: 'n1', midi: 74, startTick: 0, durationTicks: 240 },
      { id: 'n2', midi: 78, startTick: 240, durationTicks: 240 },
      { id: 'n3', midi: 81, startTick: 480, durationTicks: 120 },
      { id: 'n4', midi: 82, startTick: 600, durationTicks: 120 },
      { id: 'n5', midi: 84, startTick: 720, durationTicks: 240 },
      { id: 'n6', midi: 85, startTick: 960, durationTicks: 480 }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Three Voice Example');
    score.voices = [
      generateCantusFirmus({ mode: 'dorian', tonicPitchClass: 2, length: 8, rangeMinMidi: 48, rangeMaxMidi: 62, seed: 21 }),
      { id: 'cp1', name: 'Soprano', role: 'counterpoint', species: 'first', rangeMinMidi: 60, rangeMaxMidi: 77, notes: [
        { id: 'a1', midi: 69, startTick: 0, durationTicks: 480 },
        { id: 'a2', midi: 71, startTick: 480, durationTicks: 480 },
        { id: 'a3', midi: 72, startTick: 960, durationTicks: 480 },
        { id: 'a4', midi: 74, startTick: 1440, durationTicks: 480 },
        { id: 'a5', midi: 72, startTick: 1920, durationTicks: 480 },
        { id: 'a6', midi: 71, startTick: 2400, durationTicks: 480 },
        { id: 'a7', midi: 69, startTick: 2880, durationTicks: 480 },
        { id: 'a8', midi: 69, startTick: 3360, durationTicks: 480 }
      ] },
      { id: 'cp2', name: 'Bass', role: 'counterpoint', species: 'first', rangeMinMidi: 38, rangeMaxMidi: 55, position: 'below', notes: [
        { id: 'b1', midi: 50, startTick: 0, durationTicks: 480 },
        { id: 'b2', midi: 48, startTick: 480, durationTicks: 480 },
        { id: 'b3', midi: 47, startTick: 960, durationTicks: 480 },
        { id: 'b4', midi: 45, startTick: 1440, durationTicks: 480 },
        { id: 'b5', midi: 47, startTick: 1920, durationTicks: 480 },
        { id: 'b6', midi: 48, startTick: 2400, durationTicks: 480 },
        { id: 'b7', midi: 50, startTick: 2880, durationTicks: 480 },
        { id: 'b8', midi: 50, startTick: 3360, durationTicks: 480 }
      ] }
    ];
    return score;
  })(),
  (() => {
    const score = baseExample('Four Voice Example');
    score.voices = [
      generateCantusFirmus({ mode: 'ionian', tonicPitchClass: 0, length: 8, rangeMinMidi: 48, rangeMaxMidi: 60, seed: 22 }),
      { id: 'cp1', name: 'Soprano', role: 'counterpoint', species: 'first', rangeMinMidi: 60, rangeMaxMidi: 77, notes: [] },
      { id: 'cp2', name: 'Alto', role: 'counterpoint', species: 'second', rangeMinMidi: 55, rangeMaxMidi: 72, notes: [] },
      { id: 'cp3', name: 'Bass', role: 'counterpoint', species: 'first', rangeMinMidi: 36, rangeMaxMidi: 55, position: 'below', notes: [] }
    ];
    return score;
  })()
];

