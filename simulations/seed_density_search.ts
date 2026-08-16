#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanSeedDensity } from '../src/counterpoint/seedDensity';
import { mutateMode, mutateSeed, mutateSpecies, normalizeSeed } from '../src/counterpoint/seedMutation';
import type { Species } from '../src/counterpoint/model';
import type { ModeName } from '../src/music/mode';
import { SeededRandom } from '../src/generator/seededRandom';

interface Config {
  seed: number;
  centers: number;
  topResults: number;
  radius: number;
  step: number;
  attemptsPerSeed: number;
  totalVoices: number;
  bars: number;
  mode: ModeName;
  species: Species[];
  mutateMode: boolean;
  mutateSpecies: boolean;
  strategy: 'walk' | 'best' | 'random';
  outputDir: string;
}

interface CenterSummary {
  centerSeed: number;
  tested: number;
  hits: number;
  hitRate: number;
  bestWinningSeed?: number;
  bestAttempt?: number;
  avgAttempt?: number;
}

interface WinningSeedSummary {
  winningSeed: number;
  hits: number;
  bestAttempt: number;
  avgAttempt: number;
  lastCenterSeed: number;
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
  return modeOptions.includes(value as ModeName) ? (value as ModeName) : fallback;
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
    centers: 0,
    topResults: 25,
    radius: 32,
    step: 1,
    attemptsPerSeed: 2500,
    totalVoices: 4,
    bars: 4,
    mode: 'mixolydian',
    species: ['second', 'first', 'fifth'],
    mutateMode: false,
    mutateSpecies: false,
    strategy: 'best',
    outputDir: 'seedDensityFinds'
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

  const strategy = (args.get('--strategy')?.trim() || defaults.strategy) as Config['strategy'];
  return {
    seed: parseNumber(args.get('--seed'), defaults.seed),
    centers: Math.max(0, parseNumber(args.get('--centers'), defaults.centers)),
    topResults: Math.max(1, parseNumber(args.get('--top-results'), defaults.topResults)),
    radius: Math.max(0, parseNumber(args.get('--radius'), defaults.radius)),
    step: Math.max(1, parseNumber(args.get('--step'), defaults.step)),
    attemptsPerSeed: Math.max(1, parseNumber(args.get('--attempts-per-seed'), defaults.attemptsPerSeed)),
    totalVoices: Math.min(4, Math.max(2, parseNumber(args.get('--total-voices'), defaults.totalVoices))),
    bars: Math.max(2, parseNumber(args.get('--bars'), defaults.bars)),
    mode: parseMode(args.get('--mode'), defaults.mode),
    species: parseSpecies(args.get('--species'), defaults.species),
    mutateMode: parseBoolean(args.get('--mutate-mode'), defaults.mutateMode),
    mutateSpecies: parseBoolean(args.get('--mutate-species'), defaults.mutateSpecies),
    strategy: strategy === 'walk' || strategy === 'random' ? strategy : 'best',
    outputDir: args.get('--output-dir')?.trim() || defaults.outputDir
  };
}

function hasValidSpeciesCount(totalVoices: number, species: Species[]): boolean {
  return species.length >= Math.max(1, totalVoices - 1);
}

function writeJson(outputDir: string, filename: string, value: unknown): string {
  const targetDir = resolve(outputDir);
  mkdirSync(targetDir, { recursive: true });
  const path = resolve(targetDir, filename);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

function summarizeCenter(centerSeed: number, tested: number, hits: Array<{ runSeed: number; winningSeed: number; attempts: number }>): CenterSummary {
  const hitCount = hits.length;
  const totalAttempts = hits.reduce((sum, hit) => sum + hit.attempts, 0);
  const bestHit = [...hits].sort((a, b) => a.attempts - b.attempts || a.winningSeed - b.winningSeed)[0];
  return {
    centerSeed,
    tested,
    hits: hitCount,
    hitRate: tested > 0 ? hitCount / tested : 0,
    bestWinningSeed: bestHit?.winningSeed,
    bestAttempt: bestHit?.attempts,
    avgAttempt: hitCount > 0 ? totalAttempts / hitCount : undefined
  };
}

function sortCenterSummaries(a: CenterSummary, b: CenterSummary): number {
  return (
    b.hits - a.hits ||
    b.hitRate - a.hitRate ||
    (a.avgAttempt ?? Number.POSITIVE_INFINITY) - (b.avgAttempt ?? Number.POSITIVE_INFINITY) ||
    a.centerSeed - b.centerSeed
  );
}

function sortWinningSummaries(a: WinningSeedSummary, b: WinningSeedSummary): number {
  return (
    b.hits - a.hits ||
    a.bestAttempt - b.bestAttempt ||
    a.winningSeed - b.winningSeed
  );
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
  const centerSummaries: CenterSummary[] = [];
  const winningSeedStats = new Map<number, { hits: number; attemptsTotal: number; bestAttempt: number; lastCenterSeed: number }>();

  console.log(
    `Scanning seed neighborhoods with radius ${config.radius}, step ${config.step}, and ${config.attemptsPerSeed} attempts per seed.`
  );
  console.log(config.centers > 0 ? `Planned centers: ${config.centers}` : 'Planned centers: unlimited until interrupted');

  let scanIndex = 0;
  while (config.centers === 0 || scanIndex < config.centers) {
    scanIndex += 1;
    const nextCenter = normalizeSeed(currentSeed);
    console.log(`[${scanIndex}] scanning center ${nextCenter} (${currentMode}, ${currentSpecies.join('-')})`);

    const scan = await scanSeedDensity({
      centerSeed: nextCenter,
      radius: config.radius,
      step: config.step,
      maxAttempts: config.attemptsPerSeed,
      totalVoices: config.totalVoices,
      species: currentSpecies,
      bars: config.bars,
      mode: currentMode,
      heuristicMode: 'humanLike'
    });

    const summary = summarizeCenter(scan.centerSeed, scan.tested, scan.hits);
    centerSummaries.push(summary);
    centerSummaries.sort(sortCenterSummaries);
    centerSummaries.splice(config.topResults);

    for (const hit of scan.hits) {
      const entry = winningSeedStats.get(hit.winningSeed) ?? {
        hits: 0,
        attemptsTotal: 0,
        bestAttempt: hit.attempts,
        lastCenterSeed: hit.runSeed
      };
      entry.hits += 1;
      entry.attemptsTotal += hit.attempts;
      entry.bestAttempt = Math.min(entry.bestAttempt, hit.attempts);
      entry.lastCenterSeed = hit.runSeed;
      winningSeedStats.set(hit.winningSeed, entry);
    }

    const winningSummaries: WinningSeedSummary[] = [...winningSeedStats.entries()].map(([winningSeed, entry]) => ({
      winningSeed,
      hits: entry.hits,
      bestAttempt: entry.bestAttempt,
      avgAttempt: entry.attemptsTotal / entry.hits,
      lastCenterSeed: entry.lastCenterSeed
    }));
    winningSummaries.sort(sortWinningSummaries);
    winningSummaries.splice(config.topResults);

    const scanFile = `scan_${String(scanIndex).padStart(6, '0')}_center${nextCenter}_hits${summary.hits}.json`;
    writeJson(config.outputDir, scanFile, {
      scanIndex,
      mode: currentMode,
      species: currentSpecies,
      summary,
      hits: scan.hits
    });
    writeJson(config.outputDir, 'leaderboard.json', {
      updatedAt: new Date().toISOString(),
      config,
      topCenters: centerSummaries,
      topWinningSeeds: winningSummaries
    });

    const bestCenter = centerSummaries[0];
    const bestWinning = winningSummaries[0];
    console.log(
      `[${scanIndex}] hits=${summary.hits}/${summary.tested} rate=${summary.hitRate.toFixed(4)} ` +
      `bestCenter=${bestCenter?.centerSeed ?? 'n/a'} bestWinning=${bestWinning?.winningSeed ?? 'n/a'}`
    );

    if (config.strategy === 'random') {
      currentSeed = normalizeSeed(rng.int(1_000_000_000));
    } else if (scan.hits.length > 0 && bestWinning) {
      currentSeed = mutateSeed(bestWinning.winningSeed, rng, true);
    } else {
      currentSeed = mutateSeed(currentSeed, rng, false);
    }

    if (config.mutateMode && scanIndex % 4 === 0) {
      currentMode = mutateMode(currentMode, rng);
    }
    if (config.mutateSpecies && scanIndex % 3 === 0) {
      currentSpecies = mutateSpecies(currentSpecies, rng);
    }

    if (scanIndex % 10 === 0) {
      console.log(`[${scanIndex}] top center hit rate: ${(centerSummaries[0]?.hitRate ?? 0).toFixed(4)} | output: ${resolve(config.outputDir)}`);
    }
  }

  console.log(`Done after ${scanIndex} center scans.`);
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
