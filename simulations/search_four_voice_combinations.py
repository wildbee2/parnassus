#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'simulations' / 'eval_worker.ts'
OUTPUT_DIR = ROOT / 'searchProgramFinds'

MODES = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor']
NON_FIRST_SPECIES = ['second', 'third', 'fourth', 'fifth']
INSTRUMENTS = ['organ', 'pipe_organ', 'organ', 'pipe_organ']
TICKS_PER_WHOLE = 480
DEFAULT_ATTEMPTS_PER_COMBO = 5000
DEFAULT_RESULTS_PER_COMBO = 5


def resolve_vite_node_command() -> str:
    if sys.platform.startswith('win'):
      for candidate in [
          ROOT / 'node_modules' / '.bin' / 'vite-node.cmd',
          ROOT / 'node_modules' / '.bin' / 'vite-node.exe',
          ROOT / 'node_modules' / '.bin' / 'vite-node'
      ]:
          if candidate.exists():
              return str(candidate)
    else:
      candidate = ROOT / 'node_modules' / '.bin' / 'vite-node'
      if candidate.exists():
          return str(candidate)
    return 'vite-node'


def start_worker() -> subprocess.Popen[str]:
    return subprocess.Popen(
        [resolve_vite_node_command(), '--script', str(WORKER)],
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=None,
        text=True,
        bufsize=1
    )


def send_request(proc: subprocess.Popen[str], payload: dict[str, Any]) -> dict[str, Any]:
    if proc.stdin is None or proc.stdout is None:
        raise RuntimeError('Worker pipes are unavailable.')
    proc.stdin.write(json.dumps(payload) + '\n')
    proc.stdin.flush()
    line = proc.stdout.readline()
    if not line:
        raise RuntimeError('Worker exited without returning a response.')
    return json.loads(line)


def score_signature(score: dict[str, Any]) -> tuple[str, ...]:
    parts: list[str] = [score['mode'], str(score['tonicPitchClass']), str(score['ticksPerWhole'])]
    for voice in score.get('voices', []):
        parts.append(voice['id'])
        parts.append(voice.get('species') or '')
        parts.append(voice.get('instrument') or '')
        parts.extend(
            f"{note['midi']}@{note['startTick']}:{note['durationTicks']}"
            for note in voice.get('notes', [])
        )
    return tuple(parts)


def end_tick(score: dict[str, Any]) -> int:
    return max(
        (note['startTick'] + note['durationTicks'] for voice in score.get('voices', []) for note in voice.get('notes', [])),
        default=0
    )


def write_score(output_dir: Path, score: dict[str, Any], combo_index: int, attempt_index: int) -> Path:
    mode = score.get('mode', 'unknown')
    tonic = score.get('tonicPitchClass', 'x')
    species = '-'.join(
        voice.get('species') or 'none'
        for voice in score.get('voices', [])
        if voice.get('role') == 'counterpoint'
    )
    seed = score.get('seed', 'seed')
    filename = (
        f'combo{combo_index:04d}_'
        f'{mode}_t{tonic}_'
        f'{species}_'
        f'{seed}_a{attempt_index:04d}.json'
    )
    path = output_dir / filename
    with path.open('w', encoding='utf-8') as handle:
        json.dump(score, handle, indent=2)
        handle.write('\n')
    return path


def assign_instruments(score: dict[str, Any]) -> None:
    for index, voice in enumerate(score.get('voices', [])):
        voice['instrument'] = INSTRUMENTS[index % len(INSTRUMENTS)]


def random_species_combo(rng: random.Random) -> list[str]:
    return [
        'first',
        rng.choice(NON_FIRST_SPECIES),
        rng.choice(NON_FIRST_SPECIES)
    ]


def random_combo_label(combo_index: int, mode: str, tonic: int, species: list[str]) -> str:
    return f'combo{combo_index:04d}_{mode}_t{tonic}_{"-".join(species)}'


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Continuously search 4-voice combinations with balanced strictness and human-like generation heuristics.'
    )
    parser.add_argument('--attempts-per-combo', type=int, default=DEFAULT_ATTEMPTS_PER_COMBO)
    parser.add_argument('--results-per-combo', type=int, default=DEFAULT_RESULTS_PER_COMBO)
    parser.add_argument('--max-combos', type=int, default=None, help='Stop after this many combinations instead of running forever.')
    parser.add_argument('--seed', type=int, default=1337)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    proc = start_worker()
    rng = random.Random(args.seed)
    seen: set[tuple[str, ...]] = set()
    combo_index = 0

    try:
        while args.max_combos is None or combo_index < args.max_combos:
            combo_index += 1
            mode = rng.choice(MODES)
            tonic = rng.randrange(12)
            cp_species = random_species_combo(rng)
            combo_seed = rng.randrange(1_000_000_000)
            label = random_combo_label(combo_index, mode, tonic, cp_species)
            print(f'Searching {label} with 5000 attempts...')

            saved_this_combo = 0
            for attempt_index in range(1, args.attempts_per_combo + 1):
                attempt_seed = combo_seed + attempt_index * 7919
                payload = {
                    'type': 'generate',
                    'payload': {
                        'id': f'{label}_a{attempt_index:04d}',
                        'mode': mode,
                        'tonicPitchClass': tonic,
                        'length': 4,
                        'seed': attempt_seed,
                        'strictness': 'balanced',
                        'heuristicMode': 'humanLike',
                        'cfRangeMinMidi': 50,
                        'cfRangeMaxMidi': 69,
                        'counterpointVoices': 3,
                        'cpSpecies': cp_species
                    }
                }
                response = send_request(proc, payload)
                if not response.get('ok'):
                    print(f"  attempt {attempt_index}: worker error: {response.get('error')}", file=sys.stderr)
                    continue

                evaluation = response['evaluation']
                if evaluation.get('violations'):
                    continue

                score = response['score']
                if end_tick(score) != 4 * TICKS_PER_WHOLE:
                    continue

                signature = score_signature(score)
                if signature in seen:
                    continue
                seen.add(signature)

                assign_instruments(score)
                score['title'] = f'{label}_a{attempt_index:04d}'
                path = write_score(OUTPUT_DIR, score, combo_index, attempt_index)
                saved_this_combo += 1
                print(f'  saved {path.name}')

                if saved_this_combo >= args.results_per_combo:
                    break

            if saved_this_combo == 0:
                print('  no zero-violation finds for this combination.')

        return 0
    except KeyboardInterrupt:
        print('\nStopping search.')
        return 0
    finally:
        if proc.stdin is not None:
            proc.stdin.close()
        if proc.stdout is not None:
            proc.stdout.close()
        proc.terminate()


if __name__ == '__main__':
    raise SystemExit(main())
