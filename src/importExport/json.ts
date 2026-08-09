import type { CounterpointScore } from '../counterpoint/model';

export function exportScoreJson(score: CounterpointScore): string {
  return JSON.stringify(score, null, 2);
}

export function importScoreJson(raw: string): CounterpointScore {
  const parsed = JSON.parse(raw) as CounterpointScore;
  return parsed;
}

