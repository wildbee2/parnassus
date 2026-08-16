import { searchLabCounterpoint } from './labSearch';
import { normalizeSeed } from './seedMutation';
import type { Species } from './model';
import type { InstrumentPreset } from '../music/instruments';
import type { ModeName } from '../music/mode';
import type { GenerationStyle } from './model';

export interface SeedDensityScanHit {
  runSeed: number;
  winningSeed: number;
  attempts: number;
}

export interface SeedDensityScanResult {
  centerSeed: number;
  radius: number;
  step: number;
  tested: number;
  hits: SeedDensityScanHit[];
}

export interface SeedDensityScanOptions {
  centerSeed: number;
  radius: number;
  step?: number;
  maxAttempts?: number;
  totalVoices: number;
  species: Species[];
  bars: number;
  mode: ModeName;
  heuristicMode?: GenerationStyle;
  instruments?: InstrumentPreset[];
  signal?: AbortSignal;
  onProgress?: (tested: number, total: number, runSeed: number) => void;
}

function makeCandidateSeeds(centerSeed: number, radius: number, step: number): number[] {
  const seeds = new Set<number>();
  const safeRadius = Math.max(0, Math.floor(radius));
  const safeStep = Math.max(1, Math.floor(step));

  for (let offset = -safeRadius; offset <= safeRadius; offset += safeStep) {
    seeds.add(normalizeSeed(centerSeed + offset));
  }

  return [...seeds];
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error('Seed density scan aborted');
  error.name = 'AbortError';
  throw error;
}

export async function scanSeedDensity(options: SeedDensityScanOptions): Promise<SeedDensityScanResult> {
  const centerSeed = normalizeSeed(options.centerSeed);
  const radius = Math.max(0, Math.floor(options.radius));
  const step = Math.max(1, Math.floor(options.step ?? 1));
  const candidateSeeds = makeCandidateSeeds(centerSeed, radius, step);
  const hits: SeedDensityScanHit[] = [];
  const maxAttempts = options.maxAttempts ?? 2500;

  for (let index = 0; index < candidateSeeds.length; index += 1) {
    throwIfAborted(options.signal);
    const runSeed = candidateSeeds[index] ?? centerSeed;
    options.onProgress?.(index + 1, candidateSeeds.length, runSeed);
    const result = await searchLabCounterpoint({
      totalVoices: options.totalVoices,
      species: options.species,
      bars: options.bars,
      mode: options.mode,
      heuristicMode: options.heuristicMode ?? 'humanLike',
      instruments: options.instruments,
      seed: runSeed,
      maxAttempts
    });

    if (result) {
      hits.push({
        runSeed,
        winningSeed: result.seed,
        attempts: result.attempts
      });
    }

    if ((index + 1) % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      throwIfAborted(options.signal);
    }
  }

  return {
    centerSeed,
    radius,
    step,
    tested: candidateSeeds.length,
    hits
  };
}
