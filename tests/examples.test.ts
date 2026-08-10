import { describe, expect, test } from 'vitest';
import { canonicalExamples } from '../src/examples/builtInExamples';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';

describe('canonical examples', () => {
  test.each(canonicalExamples)('%s has zero violations', (example) => {
    const result = evaluateCounterpoint(example);
    expect(result.violations).toHaveLength(0);
  });

  test('includes non-first-species three-voice examples', () => {
    const examples = canonicalExamples.filter((example) => (
      example.voices.length === 3
      && example.voices.some((voice) => voice.role === 'counterpoint' && voice.species && voice.species !== 'first')
    ));
    expect(examples.length).toBeGreaterThanOrEqual(2);
  });
});
