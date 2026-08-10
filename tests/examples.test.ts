import { describe, expect, test } from 'vitest';
import { canonicalExamples } from '../src/examples/builtInExamples';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';

describe('canonical examples', () => {
  test.each(canonicalExamples)('%s has zero violations', (example) => {
    const result = evaluateCounterpoint(example);
    expect(result.violations).toHaveLength(0);
  });
});

