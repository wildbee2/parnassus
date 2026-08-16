import type { ModeName } from '../music/mode';
import type { InstrumentPreset } from '../music/instruments';
import type { CounterpointSettings } from './settings';

export type Species = 'first' | 'second' | 'third' | 'fourth' | 'fifth';
export type GenerationStyle = 'strict' | 'humanLike' | 'harmonizing';
export type Severity = 'fatal' | 'error' | 'warning' | 'info';
export type RuleCategory =
  | 'melody'
  | 'harmony'
  | 'motion'
  | 'dissonance'
  | 'rhythm'
  | 'cadence'
  | 'species'
  | 'range'
  | 'texture';

export interface NoteEvent {
  id: string;
  midi: number;
  startTick: number;
  durationTicks: number;
  tiedFromPrevious?: boolean;
  tiedToNext?: boolean;
}

export interface Voice {
  id: string;
  name: string;
  role: 'cantus' | 'counterpoint';
  species?: Species;
  instrument?: InstrumentPreset;
  rangeMinMidi: number;
  rangeMaxMidi: number;
  notes: NoteEvent[];
  position?: 'above' | 'below' | 'auto';
}

export interface CounterpointScore {
  id: string;
  title: string;
  tonicPitchClass: number;
  mode: ModeName;
  ticksPerWhole: number;
  voices: Voice[];
  tempoBpm: number;
  seed?: number;
}

export interface RuleMetadata {
  id: string;
  title: string;
  summary: string;
  detailedExplanation: string;
  species: Species[] | 'all';
  defaultSeverity: Severity;
  configurable: boolean;
  category: RuleCategory;
}

export interface SuggestedFix {
  description: string;
  noteChanges: {
    noteId: string;
    oldMidi: number;
    newMidi: number;
  }[];
  estimatedScoreDelta: number;
}

export interface RuleViolation {
  ruleId: string;
  severity: Severity;
  message: string;
  explanation: string;
  voiceIds: string[];
  startTick: number;
  endTick?: number;
  noteIds?: string[];
  suggestedFixes?: SuggestedFix[];
  category: RuleCategory;
}

export interface RuleContext {
  score: CounterpointScore;
  voiceIndex?: number;
  otherVoiceIndex?: number;
  eventIndex?: number;
}

export interface CounterpointRule {
  id: string;
  name: string;
  category: RuleCategory;
  applies(context: RuleContext): boolean;
  evaluate(context: RuleContext): RuleViolation[];
  metadata: RuleMetadata;
}

export interface CategoryScores {
  speciesCompliance: number;
  melodicQuality: number;
  consonanceHandling: number;
  voiceIndependence: number;
  perfectControl: number;
  cadence: number;
  rangeTessitura: number;
  multiVoiceTexture: number;
}

export interface EvaluationResult {
  score: number;
  categoryScores: CategoryScores;
  violations: RuleViolation[];
  cadenceAnalysis: import('../music/cadence').CadenceAnalysis;
  motionStatistics: Record<string, number>;
  intervalStatistics: Record<string, number>;
  speciesAnalysis: Record<string, number>;
  profileName: string;
}

export interface SearchOptions {
  beamWidth: number;
  maxBacktracks: number;
  seed: number;
  strictness: 'strict' | 'balanced' | 'permissive';
  heuristicMode?: GenerationStyle;
  settings?: Partial<CounterpointSettings>;
}

export interface Candidate {
  midi: number;
  durationTicks: number;
  tie?: boolean;
}

export interface SearchState {
  score: CounterpointScore;
  nextVoiceId: string;
  nextTick: number;
  accumulatedScore: number;
}

export interface GenerateRequest {
  score: CounterpointScore;
  options: SearchOptions;
  selectedVoiceIds?: string[];
}

export interface GeneratedResult {
  score: CounterpointScore;
  evaluation: EvaluationResult;
  candidates: CounterpointScore[];
  message: string;
}

export interface EvaluateRequest {
  score: CounterpointScore;
}

export interface ProgressData {
  stage: string;
  current: number;
  total?: number;
  candidatesExamined?: number;
}

export const DEFAULT_RANGES = {
  soprano: { min: 'C4', max: 'G5' },
  alto: { min: 'G3', max: 'D5' },
  tenor: { min: 'C3', max: 'G4' },
  bass: { min: 'E2', max: 'C4' }
} as const;
