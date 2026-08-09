import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCounterpoint } from '../src/counterpoint/evaluator';
import type { CounterpointScore } from '../src/counterpoint/model';

const fixtureDir = path.resolve('tests/fixtures');

describe('fixtures', () => {
  const files = fs.readdirSync(fixtureDir).filter((file) => file.endsWith('.json'));

  test.each(files)('%s parses', (file) => {
    const raw = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
    const score = JSON.parse(raw) as CounterpointScore;
    expect(score.voices.length).toBeGreaterThan(0);
  });

  test.each(files)('%s evaluates', (file) => {
    const raw = fs.readFileSync(path.join(fixtureDir, file), 'utf8');
    const score = JSON.parse(raw) as CounterpointScore;
    const result = evaluateCounterpoint(score);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

