import { SeededRandom } from '../generator/seededRandom';
import type { ModeName } from '../music/mode';
import type { Species } from './model';

const MODE_OPTIONS: ModeName[] = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor'];
const FAVORABLE_MODES: ModeName[] = ['mixolydian', 'dorian', 'ionian', 'aeolian'];
const FAVORABLE_SPECIES: Species[][] = [
  ['second', 'first', 'fifth'],
  ['second', 'first', 'third'],
  ['first', 'second', 'fifth'],
  ['first', 'first', 'fifth']
];
const SMALL_DELTAS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
const WIDE_DELTAS = [8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
const XOR_MASKS = [0x1, 0x3, 0x7, 0xf, 0x1f, 0x3f, 0x7f, 0xff, 0x1ff, 0x3ff, 0x7ff, 0xfff];

export function normalizeSeed(seed: number): number {
  const mod = 1_000_000_000;
  return ((seed % mod) + mod) % mod;
}

export function mutateSeed(seed: number, rng: SeededRandom, hot = false): number {
  const deltaPool = hot ? SMALL_DELTAS : WIDE_DELTAS;
  const mode = rng.int(100);

  if (mode < 45) {
    const delta = deltaPool[rng.int(deltaPool.length)] ?? 1;
    const sign = rng.int(2) === 0 ? 1 : -1;
    return normalizeSeed(seed + sign * delta);
  }

  if (mode < 70) {
    const delta = deltaPool[rng.int(deltaPool.length)] ?? 1;
    const sign = rng.int(2) === 0 ? 1 : -1;
    return normalizeSeed(seed + sign * delta * (hot ? 2 : 8));
  }

  if (mode < 90) {
    const mask = XOR_MASKS[rng.int(XOR_MASKS.length)] ?? 0x1f;
    const shift = rng.int(8);
    return normalizeSeed((seed ^ (mask << shift)) >>> 0);
  }

  const salt = rng.int(1_000_000_000);
  return normalizeSeed((Math.imul(seed ^ salt, 1664525) + 1013904223) >>> 0);
}

export function mutateMode(mode: ModeName, rng: SeededRandom): ModeName {
  const currentIndex = MODE_OPTIONS.indexOf(mode);
  if (currentIndex < 0) return FAVORABLE_MODES[rng.int(FAVORABLE_MODES.length)] ?? 'mixolydian';
  const choices = [
    MODE_OPTIONS[(currentIndex - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length],
    MODE_OPTIONS[(currentIndex + 1) % MODE_OPTIONS.length],
    FAVORABLE_MODES[rng.int(FAVORABLE_MODES.length)] ?? mode
  ];
  return choices[rng.int(choices.length)] ?? mode;
}

export function mutateSpecies(species: Species[], rng: SeededRandom): Species[] {
  const pool = FAVORABLE_SPECIES[rng.int(FAVORABLE_SPECIES.length)] ?? species;
  const next = [...species];
  const index = rng.int(next.length);
  next[index] = pool[index] ?? next[index];
  return next;
}
