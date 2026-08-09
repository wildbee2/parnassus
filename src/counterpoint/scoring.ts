import type { CategoryScores, EvaluationResult, RuleViolation, Severity } from './model';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  fatal: 20,
  error: 7,
  warning: 2,
  info: 0.5
};

export function scoreViolations(violations: RuleViolation[]): number {
  const seen = new Map<string, number>();
  let penalty = 0;
  for (const violation of violations) {
    const count = (seen.get(violation.ruleId) ?? 0) + 1;
    seen.set(violation.ruleId, count);
    const diminishing = count === 1 ? 1 : count === 2 ? 0.8 : count === 3 ? 0.6 : 0.4;
    penalty += (SEVERITY_WEIGHTS[violation.severity] ?? 1) * diminishing;
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function categoryScoresFromViolations(violations: RuleViolation[]): CategoryScores {
  const group = (category: keyof CategoryScores, predicate: (v: RuleViolation) => boolean): number => {
    const count = violations.filter(predicate).length;
    return Math.max(0, 100 - count * 10);
  };
  return {
    speciesCompliance: group('speciesCompliance', (v) => v.category === 'species'),
    melodicQuality: group('melodicQuality', (v) => v.category === 'melody'),
    consonanceHandling: group('consonanceHandling', (v) => v.category === 'dissonance' || v.category === 'harmony'),
    voiceIndependence: group('voiceIndependence', (v) => v.category === 'motion' || v.category === 'texture'),
    perfectControl: group('perfectControl', (v) => v.ruleId.startsWith('HAR_PARALLEL') || v.ruleId.startsWith('HAR_DIRECT')),
    cadence: group('cadence', (v) => v.category === 'cadence'),
    rangeTessitura: group('rangeTessitura', (v) => v.category === 'range'),
    multiVoiceTexture: group('multiVoiceTexture', (v) => v.category === 'texture')
  };
}

export function buildEvaluationResult(violations: RuleViolation[], extras: Omit<EvaluationResult, 'score' | 'categoryScores' | 'violations'>): EvaluationResult {
  return {
    score: scoreViolations(violations),
    categoryScores: categoryScoresFromViolations(violations),
    violations,
    ...extras
  };
}

