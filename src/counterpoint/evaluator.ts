import { evaluateScore } from './rules';
import { buildEvaluationResult } from './scoring';
import type { CounterpointScore, EvaluationResult, GenerationStyle } from './model';
import type { CounterpointSettings } from './settings';
import { resolveCounterpointSettings } from './settings';

export function evaluateCounterpoint(
  score: CounterpointScore,
  settingsOrHeuristicMode: GenerationStyle | Partial<CounterpointSettings> = 'strict'
): EvaluationResult {
  const settings = resolveCounterpointSettings(settingsOrHeuristicMode);
  const { violations, cadence } = evaluateScore(score, settings);
  const motionStatistics: Record<string, number> = {
    voices: score.voices.length,
    totalNotes: score.voices.reduce((sum, voice) => sum + voice.notes.length, 0)
  };
  const intervalStatistics: Record<string, number> = {
    perfectIntervals: violations.filter((v) => v.ruleId.startsWith('HAR_PARALLEL') || v.ruleId.startsWith('HAR_DIRECT')).length
  };
  const speciesAnalysis: Record<string, number> = score.voices.reduce<Record<string, number>>((acc, voice) => {
    if (voice.species) {
      acc[voice.species] = (acc[voice.species] ?? 0) + 1;
    }
    return acc;
  }, {});
  const profileName =
    settings.heuristicMode === 'humanLike'
      ? 'Fux-Inspired Human-Like Counterpoint'
      : settings.heuristicMode === 'harmonizing'
        ? 'HCP Harmonizing Counterpoint'
        : 'Fux-Inspired Strict Species Counterpoint';
  return buildEvaluationResult(violations, {
    cadenceAnalysis: cadence,
    motionStatistics,
    intervalStatistics,
    speciesAnalysis,
    profileName
  });
}
