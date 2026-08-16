#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { searchLabCounterpoint } from '../src/counterpoint/labSearch';
import { mutateMode, mutateSeed, mutateSpecies, normalizeSeed } from '../src/counterpoint/seedMutation';
import type { Species } from '../src/counterpoint/model';
import type { ModeName } from '../src/music/mode';
import { SeededRandom } from '../src/generator/seededRandom';

interface Config {
  seed: number;
  results: number;
  maxRuns: number;
  attemptThreshold: number;
  totalVoices: number;
  bars: number;
  mode: ModeName;
  species: Species[];
  mutateMode: boolean;
  mutateSpecies: boolean;
  outputDir: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseMode(value: string | undefined, fallback: ModeName): ModeName {
  const modeOptions: ModeName[] = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor'];
  if (!value) return fallback;
  return (modeOptions.includes(value as ModeName) ? (value as ModeName) : fallback);
}

function parseSpecies(value: string | undefined, fallback: Species[]): Species[] {
  if (!value) return [...fallback];
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean) as Species[];
  return parts.length > 0 ? parts : [...fallback];
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArgs(argv: string[]): Config {
  const defaults: Config = {
    seed: 1337,
    results: 10,
    maxRuns: 250,
    attemptThreshold: 500,
    totalVoices: 4,
    bars: 4,
    mode: 'mixolydian',
    species: ['second', 'first', 'fifth'],
    mutateMode: false,
    mutateSpecies: false,
    outputDir: 'seedMutationFinds'
  };

  const args = new Map<string, string | undefined>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args.set(token, next);
      index += 1;
    } else {
      args.set(token, undefined);
    }
  }

  return {
    seed: parseNumber(args.get('--seed'), defaults.seed),
    results: Math.max(1, parseNumber(args.get('--results'), defaults.results)),
    maxRuns: Math.max(1, parseNumber(args.get('--max-runs'), defaults.maxRuns)),
    attemptThreshold: Math.max(1, parseNumber(args.get('--attempt-threshold'), defaults.attemptThreshold)),
    totalVoices: Math.min(4, Math.max(2, parseNumber(args.get('--total-voices'), defaults.totalVoices))),
    bars: Math.max(2, parseNumber(args.get('--bars'), defaults.bars)),
    mode: parseMode(args.get('--mode'), defaults.mode),
    species: parseSpecies(args.get('--species'), defaults.species),
    mutateMode: parseBoolean(args.get('--mutate-mode'), defaults.mutateMode),
    mutateSpecies: parseBoolean(args.get('--mutate-species'), defaults.mutateSpecies),
    outputDir: args.get('--output-dir')?.trim() || defaults.outputDir
  };
}

function hasValidSpeciesCount(totalVoices: number, species: Species[]): boolean {
  return species.length >= Math.max(1, totalVoices - 1);
}

function speciesLabel(species: Species[]): string {
  return species.join('-');
}

function writeScore(
  outputDir: string,
  score: Awaited<ReturnType<typeof searchLabCounterpoint>> extends infer Result
    ? Result extends { score: infer Score }
      ? Score
      : never
    : never,
  filename: string
): string {
  const targetDir = resolve(outputDir);
  mkdirSync(targetDir, { recursive: true });
  const path = resolve(targetDir, filename);
  writeFileSync(path, `${JSON.stringify(score, null, 2)}\n`, 'utf8');
  return path;
}

function makeFilename(
  mode: ModeName,
  species: Species[],
  runSeed: number,
  winningSeed: number,
  attempts: number
): string {
  const safeSpecies = speciesLabel(species);
  return `seedmut_${mode}_cp${safeSpecies}_run${runSeed}_hit${winningSeed}_a${attempts}.json`;
}

async function main(): Promise<number> {
  const config = parseArgs(process.argv.slice(2));

  if (!hasValidSpeciesCount(config.totalVoices, config.species)) {
    console.error(`Need at least ${Math.max(1, config.totalVoices - 1)} species entries for ${config.totalVoices} total voices.`);
    return 1;
  }

  const rng = new SeededRandom(config.seed);
  let currentSeed = normalizeSeed(config.seed);
  let currentMode = config.mode;
  let currentSpecies = config.species.slice(0, Math.max(1, config.totalVoices - 1));
  let saved = 0;

  console.log(
    `Searching for early matches with up to ${config.maxRuns} runs, ${config.attemptThreshold} attempts per run, starting seed ${currentSeed}.`
  );

  for (let runIndex = 1; runIndex <= config.maxRuns; runIndex += 1) {
    const result = await searchLabCounterpoint({
      totalVoices: config.totalVoices,
      species: currentSpecies,
      bars: config.bars,
      mode: currentMode,
      maxAttempts: config.attemptThreshold,
      heuristicMode: 'humanLike',
      seed: currentSeed
    });

    if (result) {
      const title = `Seed mutator ${currentMode} run ${currentSeed} hit ${result.seed} at attempt ${result.attempts}`;
      result.score.title = title;
      const filename = makeFilename(currentMode, currentSpecies, currentSeed, result.seed, result.attempts);
      const path = writeScore(config.outputDir, result.score, filename);
      saved += 1;
      console.log(`[${runIndex}] saved ${path} (attempt ${result.attempts}, winning seed ${result.seed})`);

      if (saved >= config.results) {
        console.log(`Done: saved ${saved} early matches.`);
        return 0;
      }

      currentSeed = mutateSeed(result.seed, rng, true);
      if (config.mutateMode) {
        currentMode = mutateMode(currentMode, rng);
      }
      if (config.mutateSpecies) {
        currentSpecies = mutateSpecies(currentSpecies, rng);
      }
      continue;
    }

    console.log(`[${runIndex}] no early match from seed ${currentSeed}; mutating and trying again.`);
    currentSeed = mutateSeed(currentSeed, rng, false);
    if (config.mutateMode && runIndex % 4 === 0) {
      currentMode = mutateMode(currentMode, rng);
    }
    if (config.mutateSpecies && runIndex % 3 === 0) {
      currentSpecies = mutateSpecies(currentSpecies, rng);
    }
  }

  console.log(`Done: saved ${saved} early matches after ${config.maxRuns} runs.`);
  return 0;
}

void main().then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
}).catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
