import type { GenerationStyle } from './model';
import type { ModeName } from '../music/mode';
import { modeDegreeToPc } from '../music/mode';

export interface CounterpointSettings {
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

export const defaultCounterpointSettings: CounterpointSettings = {
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

export function resolveCounterpointSettings(
  input?: Partial<CounterpointSettings> | GenerationStyle
): CounterpointSettings {
  if (!input) return { ...defaultCounterpointSettings };
  if (input === 'strict' || input === 'humanLike' || input === 'harmonizing') {
    return {
      ...defaultCounterpointSettings,
      heuristicMode: input,
      ...(input === 'harmonizing'
        ? {
            permitMoreThanThreeThirds: true,
            permitMoreThanThreeSixths: true,
            allowAccentedPassingDissonance: true,
            strictSuspensionResolution: false,
            permitRepeatedNotes: true
          }
        : {})
    };
  }
  return { ...defaultCounterpointSettings, ...input };
}

export function isMinorMode(mode: ModeName): boolean {
  return mode === 'aeolian' || mode === 'natural_minor';
}

export function melodicMinorSixthPitchClass(mode: ModeName, tonicPitchClass: number): number {
  return (modeDegreeToPc(mode, tonicPitchClass, 6) + 1) % 12;
}
