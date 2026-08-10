import type { CounterpointScore, NoteEvent, Species, Voice } from '../counterpoint/model';

type ExampleSpec = {
  title: string;
  mode: CounterpointScore['mode'];
  tonicPitchClass: number;
  cfRange: { min: number; max: number };
  cpRange: { min: number; max: number };
  cfNotes: NoteSpec[];
  cpNotes: NoteSpec[];
  species?: Species;
};

type TextureExampleSpec = {
  title: string;
  mode: CounterpointScore['mode'];
  tonicPitchClass: number;
  voices: Array<{
    id: string;
    name: string;
    role: Voice['role'];
    rangeMinMidi: number;
    rangeMaxMidi: number;
    notes: NoteSpec[];
    species?: Species;
    position?: Voice['position'];
  }>;
};

type NoteSpec = number | {
  midi: number;
  durationTicks?: number;
  tiedFromPrevious?: boolean;
  tiedToNext?: boolean;
};

function notesFromSpecs(prefix: string, noteSpecs: NoteSpec[], defaultDurationTicks: number): NoteEvent[] {
  let startTick = 0;
  return noteSpecs.map((spec, index) => {
    const note = typeof spec === 'number' ? { midi: spec } : spec;
    const durationTicks = note.durationTicks ?? defaultDurationTicks;
    const event: NoteEvent = {
      id: `${prefix}-${index}`,
      midi: note.midi,
      startTick,
      durationTicks,
      tiedFromPrevious: note.tiedFromPrevious,
      tiedToNext: note.tiedToNext
    };
    startTick += durationTicks;
    return event;
  });
}

function makeScore(title: string, mode: CounterpointScore['mode'], tonicPitchClass: number, voices: Voice[]): CounterpointScore {
  return {
    id: crypto.randomUUID(),
    title,
    tonicPitchClass,
    mode,
    ticksPerWhole: 480,
    tempoBpm: 96,
    voices
  };
}

function makeTwoVoiceExample(spec: ExampleSpec): CounterpointScore {
  const cf: Voice = {
    id: 'cf',
    name: 'Cantus Firmus',
    role: 'cantus',
    rangeMinMidi: spec.cfRange.min,
    rangeMaxMidi: spec.cfRange.max,
    notes: notesFromSpecs('cf', spec.cfNotes, 480)
  };
  const cp: Voice = {
    id: 'cp',
    name: 'Counterpoint',
    role: 'counterpoint',
    species: spec.species ?? 'first',
    rangeMinMidi: spec.cpRange.min,
    rangeMaxMidi: spec.cpRange.max,
    notes: notesFromSpecs('cp', spec.cpNotes, 480)
  };
  return makeScore(spec.title, spec.mode, spec.tonicPitchClass, [cf, cp]);
}

function makeTextureExample(spec: TextureExampleSpec): CounterpointScore {
  const voices: Voice[] = spec.voices.map((voice) => ({
    id: voice.id,
    name: voice.name,
    role: voice.role,
    species: voice.species,
    rangeMinMidi: voice.rangeMinMidi,
    rangeMaxMidi: voice.rangeMaxMidi,
    position: voice.position,
    notes: notesFromSpecs(voice.id, voice.notes, 480)
  }));
  return makeScore(spec.title, spec.mode, spec.tonicPitchClass, voices);
}

export const canonicalExamples: CounterpointScore[] = [
  makeTwoVoiceExample({
    title: 'Two Voices - First Species',
    mode: 'dorian',
    tonicPitchClass: 2,
    cfRange: { min: 62, max: 67 },
    cpRange: { min: 65, max: 74 },
    cfNotes: [62, 64, 65, 62],
    cpNotes: [65, 67, 74, 71],
    species: 'first'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Second Species',
    mode: 'ionian',
    tonicPitchClass: 0,
    cfRange: { min: 60, max: 62 },
    cpRange: { min: 64, max: 76 },
    cfNotes: [60, 62],
    cpNotes: [
      { midi: 67, durationTicks: 240 },
      { midi: 69, durationTicks: 240 },
      { midi: 71, durationTicks: 240 },
      { midi: 69, durationTicks: 240 }
    ],
    species: 'second'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Third Species',
    mode: 'phrygian',
    tonicPitchClass: 4,
    cfRange: { min: 60, max: 62 },
    cpRange: { min: 65, max: 74 },
    cfNotes: [60, 62],
    cpNotes: [
      { midi: 67, durationTicks: 120 },
      { midi: 69, durationTicks: 120 },
      { midi: 71, durationTicks: 120 },
      { midi: 72, durationTicks: 120 },
      { midi: 71, durationTicks: 120 },
      { midi: 69, durationTicks: 120 },
      { midi: 67, durationTicks: 120 },
      { midi: 65, durationTicks: 120 }
    ],
    species: 'third'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Fourth Species',
    mode: 'ionian',
    tonicPitchClass: 0,
    cfRange: { min: 61, max: 64 },
    cpRange: { min: 65, max: 67 },
    cfNotes: [64, 61, 62],
    cpNotes: [
      { midi: 67, durationTicks: 480, tiedToNext: true },
      { midi: 66, durationTicks: 480, tiedFromPrevious: true, tiedToNext: true },
      { midi: 65, durationTicks: 480 }
    ],
    species: 'fourth'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Fifth Species',
    mode: 'mixolydian',
    tonicPitchClass: 7,
    cfRange: { min: 67, max: 69 },
    cpRange: { min: 71, max: 76 },
    cfNotes: [67, 69],
    cpNotes: [
      { midi: 71, durationTicks: 240 },
      { midi: 72, durationTicks: 120 },
      { midi: 74, durationTicks: 120 },
      { midi: 72, durationTicks: 240 },
      { midi: 74, durationTicks: 120 },
      { midi: 72, durationTicks: 120 }
    ],
    species: 'fifth'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Grand Piano Second Species',
    mode: 'ionian',
    tonicPitchClass: 0,
    cfRange: { min: 48, max: 50 },
    cpRange: { min: 55, max: 62 },
    cfNotes: [48, 50],
    cpNotes: [
      { midi: 55, durationTicks: 240 },
      { midi: 60, durationTicks: 240 },
      { midi: 57, durationTicks: 240 },
      { midi: 62, durationTicks: 240 }
    ],
    species: 'second'
  }),
  makeTwoVoiceExample({
    title: 'Two Voices - Organ Third Species',
    mode: 'dorian',
    tonicPitchClass: 2,
    cfRange: { min: 48, max: 50 },
    cpRange: { min: 55, max: 62 },
    cfNotes: [48, 50],
    cpNotes: [
      { midi: 55, durationTicks: 120 },
      { midi: 60, durationTicks: 120 },
      { midi: 55, durationTicks: 120 },
      { midi: 60, durationTicks: 120 },
      { midi: 57, durationTicks: 120 },
      { midi: 62, durationTicks: 120 },
      { midi: 57, durationTicks: 120 },
      { midi: 62, durationTicks: 120 }
    ],
    species: 'third'
  }),
  makeTextureExample({
    title: 'Three Voices - Trumpet Trio Second Species',
    mode: 'ionian',
    tonicPitchClass: 0,
    voices: [
      {
        id: 'cf',
        name: 'Cantus Firmus',
        role: 'cantus',
        rangeMinMidi: 46,
        rangeMaxMidi: 50,
        notes: [48, 50, 48, 50]
      },
      {
        id: 'middle',
        name: 'Middle Voice',
        role: 'counterpoint',
        species: 'second',
        rangeMinMidi: 58,
        rangeMaxMidi: 62,
        notes: [60, 59, 60, 59]
      },
      {
        id: 'high',
        name: 'High Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 68,
        rangeMaxMidi: 72,
        notes: [69, 71, 69, 71]
      }
    ]
  }),
  makeTextureExample({
    title: 'Three Voices - Violin Trio Third Species',
    mode: 'dorian',
    tonicPitchClass: 2,
    voices: [
      {
        id: 'cf',
        name: 'Cantus Firmus',
        role: 'cantus',
        rangeMinMidi: 46,
        rangeMaxMidi: 50,
        notes: [48, 50, 48, 50]
      },
      {
        id: 'middle',
        name: 'Middle Voice',
        role: 'counterpoint',
        species: 'third',
        rangeMinMidi: 58,
        rangeMaxMidi: 62,
        notes: [60, 59, 60, 59]
      },
      {
        id: 'high',
        name: 'High Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 68,
        rangeMaxMidi: 72,
        notes: [69, 71, 69, 71]
      }
    ]
  }),
  makeTextureExample({
    title: 'Three Voices - Bach Sinfonia Inspired',
    mode: 'ionian',
    tonicPitchClass: 0,
    voices: [
      {
        id: 'cf',
        name: 'Cantus Firmus',
        role: 'cantus',
        rangeMinMidi: 46,
        rangeMaxMidi: 50,
        notes: [48, 50, 48, 50]
      },
      {
        id: 'mid',
        name: 'Middle Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 58,
        rangeMaxMidi: 62,
        notes: [60, 59, 60, 59]
      },
      {
        id: 'high',
        name: 'High Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 68,
        rangeMaxMidi: 72,
        notes: [69, 71, 69, 71]
      }
    ]
  }),
  makeTextureExample({
    title: 'Four Voices - Bach Chorale Inspired',
    mode: 'ionian',
    tonicPitchClass: 0,
    voices: [
      {
        id: 'cf',
        name: 'Cantus Firmus',
        role: 'cantus',
        rangeMinMidi: 46,
        rangeMaxMidi: 50,
        notes: [48, 50, 48, 50]
      },
      {
        id: 'mid',
        name: 'Middle Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 58,
        rangeMaxMidi: 62,
        notes: [60, 59, 60, 59]
      },
      {
        id: 'high',
        name: 'High Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 68,
        rangeMaxMidi: 72,
        notes: [69, 71, 69, 71]
      },
      {
        id: 'top',
        name: 'Top Voice',
        role: 'counterpoint',
        species: 'first',
        rangeMinMidi: 74,
        rangeMaxMidi: 77,
        notes: [76, 74, 76, 74]
      }
    ]
  })
];

// Study examples remain available, but they are not surfaced by default.
export const studyExamples: CounterpointScore[] = [
  makeTwoVoiceExample({
    title: 'Study Example - Parallel Fifths',
    mode: 'dorian',
    tonicPitchClass: 2,
    cfRange: { min: 50, max: 65 },
    cpRange: { min: 57, max: 62 },
    cfNotes: [50, 52, 53, 50],
    cpNotes: [57, 59, 60, 62]
  }),
  makeTwoVoiceExample({
    title: 'Study Example - Unresolved Suspension',
    mode: 'phrygian',
    tonicPitchClass: 4,
    cfRange: { min: 64, max: 65 },
    cpRange: { min: 67, max: 69 },
    cfNotes: [64, 62, 64, 62],
    cpNotes: [67, 69, 71, 69],
    species: 'fourth'
  })
];
