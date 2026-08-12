import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CounterpointScore, GeneratedResult, GenerationStyle, Species } from '../counterpoint/model';
import { DEFAULT_RANGES } from '../counterpoint/model';
import { generateCantusFirmus } from '../generator/cantusGenerator';
import { generateCounterpointScore } from '../generator/multiVoiceGenerator';
import { evaluateCounterpoint } from '../counterpoint/evaluator';

export interface AppSettings {
  permitRepeatedNotes: boolean;
  permitMoreThanThreeThirds: boolean;
  permitMoreThanThreeSixths: boolean;
  directPerfectStrictness: number;
  permitVoiceCrossing: boolean;
  permitVoiceOverlap: boolean;
  allowCambiata: boolean;
  allowAccentedPassingDissonance: boolean;
  strictSuspensionResolution: boolean;
  permitMelodicMinorSixth: boolean;
  permitOctaveLeap: boolean;
  climaxUniquenessStrictness: number;
  cadenceStrictness: number;
  musicaFicta: boolean;
  fourthAboveBassDissonant: boolean;
  strictnessProfile: 'strict' | 'balanced' | 'permissive';
  heuristicMode: GenerationStyle;
}

export interface RecentExercise {
  id: string;
  title: string;
  timestamp: number;
}

export interface AppState {
  score: CounterpointScore;
  selectedNoteId?: string;
  selectedVoiceId?: string;
  evaluation: ReturnType<typeof evaluateCounterpoint> | null;
  settings: AppSettings;
  history: CounterpointScore[];
  future: CounterpointScore[];
  recentExercises: RecentExercise[];
  setScore: (score: CounterpointScore) => void;
  setSelectedNoteId: (noteId?: string) => void;
  setSelectedVoiceId: (voiceId?: string) => void;
  updateScore: (updater: (score: CounterpointScore) => CounterpointScore) => void;
  updateVoice: (voiceId: string, patch: Partial<CounterpointScore['voices'][number]>) => void;
  updateNote: (voiceId: string, noteId: string, patch: Partial<CounterpointScore['voices'][number]['notes'][number]>) => void;
  setTempo: (tempoBpm: number) => void;
  setTitle: (title: string) => void;
  undo: () => void;
  redo: () => void;
  evaluate: () => void;
  generate: () => GeneratedResult;
  loadExample: (score: CounterpointScore) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearScore: () => void;
}

function makeScore(): CounterpointScore {
  const speciesPool: Species[] = ['first', 'second', 'third', 'fourth', 'fifth'];
  const pickRandomSpecies = (): Species => speciesPool[Math.floor(Math.random() * speciesPool.length)] ?? 'first';
  const cf = generateCantusFirmus({
    mode: 'mixolydian',
    tonicPitchClass: 2,
    length: 10,
    rangeMinMidi: 50,
    rangeMaxMidi: 69,
    seed: 17
  });
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Exercise',
    tonicPitchClass: 2,
    mode: 'mixolydian',
    ticksPerWhole: 480,
    voices: [
      cf,
      {
        id: 'cp1',
        name: 'Counterpoint 1',
        role: 'counterpoint',
        species: pickRandomSpecies(),
        rangeMinMidi: 55,
        rangeMaxMidi: 76,
        position: 'above',
        notes: []
      },
      {
        id: 'cp2',
        name: 'Counterpoint 2',
        role: 'counterpoint',
        species: pickRandomSpecies(),
        rangeMinMidi: 48,
        rangeMaxMidi: 67,
        position: 'below',
        notes: []
      }
    ],
    tempoBpm: 96,
    seed: 17
  };
}

const defaultSettings: AppSettings = {
  permitRepeatedNotes: false,
  permitMoreThanThreeThirds: false,
  permitMoreThanThreeSixths: false,
  directPerfectStrictness: 0.9,
  permitVoiceCrossing: false,
  permitVoiceOverlap: false,
  allowCambiata: true,
  allowAccentedPassingDissonance: false,
  strictSuspensionResolution: true,
  permitMelodicMinorSixth: true,
  permitOctaveLeap: false,
  climaxUniquenessStrictness: 0.8,
  cadenceStrictness: 0.9,
  musicaFicta: false,
  fourthAboveBassDissonant: true,
  strictnessProfile: 'balanced',
  heuristicMode: 'humanLike'
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      score: makeScore(),
      selectedNoteId: undefined,
      selectedVoiceId: undefined,
      evaluation: null,
      settings: defaultSettings,
      history: [],
      future: [],
      recentExercises: [],
      setScore: (score) => set((state) => ({ history: [...state.history, state.score], score, future: [] })),
      setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
      setSelectedVoiceId: (selectedVoiceId) => set({ selectedVoiceId }),
      updateScore: (updater) => set((state) => ({ history: [...state.history, state.score], score: updater(structuredClone(state.score)), future: [] })),
      updateVoice: (voiceId, patch) => set((state) => ({
        history: [...state.history, state.score],
        score: {
          ...state.score,
          voices: state.score.voices.map((voice) => (voice.id === voiceId ? { ...voice, ...patch } : voice))
        }
      })),
      updateNote: (voiceId, noteId, patch) => set((state) => ({
        history: [...state.history, state.score],
        score: {
          ...state.score,
          voices: state.score.voices.map((voice) =>
            voice.id === voiceId
              ? { ...voice, notes: voice.notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note)) }
              : voice
          )
        }
      })),
      setTempo: (tempoBpm) => set((state) => ({ history: [...state.history, state.score], score: { ...state.score, tempoBpm } })),
      setTitle: (title) => set((state) => ({ history: [...state.history, state.score], score: { ...state.score, title } })),
      undo: () => set((state) => {
        const previous = state.history.at(-1);
        if (!previous) return state;
        return {
          score: previous,
          history: state.history.slice(0, -1),
          future: [state.score, ...state.future]
        };
      }),
      redo: () => set((state) => {
        const [next, ...rest] = state.future;
        if (!next) return state;
        return { score: next, history: [...state.history, state.score], future: rest };
      }),
      evaluate: () => set((state) => ({ evaluation: evaluateCounterpoint(state.score, get().settings.heuristicMode) })),
      generate: () => {
        const seed = get().score.seed ?? 17;
        const result = generateCounterpointScore({
          score: get().score,
          options: {
            beamWidth: 40,
            maxBacktracks: 80,
            seed,
            strictness: get().settings.strictnessProfile,
            heuristicMode: get().settings.heuristicMode
          }
        });
        set((state) => ({
          history: [...state.history, state.score],
          score: result.score,
          evaluation: result.evaluation,
          recentExercises: [
            { id: result.score.id, title: result.score.title, timestamp: Date.now() },
            ...state.recentExercises
          ].slice(0, 10)
        }));
        return result;
      },
      loadExample: (score) => set((state) => ({
        history: [...state.history, state.score],
        score,
        future: [],
        selectedNoteId: undefined,
        selectedVoiceId: undefined,
        evaluation: evaluateCounterpoint(score, get().settings.heuristicMode),
        recentExercises: [
          { id: score.id, title: score.title, timestamp: Date.now() },
          ...state.recentExercises
        ].slice(0, 10)
      })),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      clearScore: () => set((state) => ({ history: [...state.history, state.score], score: makeScore(), future: [], selectedNoteId: undefined, selectedVoiceId: undefined, evaluation: null }))
    }),
    {
      name: 'gradus-counterpoint-studio',
      version: 2,
      migrate: (persistedState) => {
        const legacyState = persistedState as Partial<Pick<AppState, 'settings' | 'recentExercises' | 'score'>> | undefined;
        return {
          settings: { ...defaultSettings, ...(legacyState?.settings ?? {}) },
          recentExercises: legacyState?.recentExercises ?? [],
          score: legacyState?.score ?? makeScore()
        };
      },
      partialize: (state) => ({
        settings: state.settings,
        recentExercises: state.recentExercises,
        score: state.score
      })
    }
  )
);

export function defaultScore(): CounterpointScore {
  return makeScore();
}

export const rangeDefaults = DEFAULT_RANGES;
