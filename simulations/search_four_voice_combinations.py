#!/usr/bin/env python3
from __future__ import annotations

import argparse
import multiprocessing as mp
import json
import random
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'simulations' / 'eval_worker.ts'
OUTPUT_DIR = ROOT / 'searchProgramFinds'

MODES = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor']
NON_FIRST_SPECIES = ['second', 'third', 'fourth', 'fifth']
PREFERRED_SPECIES_COMBO = ['second', 'first', 'fifth']
SPECIES_COMBO_POOL = [
    (PREFERRED_SPECIES_COMBO, 14),
    (['second', 'first', 'fourth'], 3),
    (['second', 'third', 'fifth'], 2),
    (['first', 'second', 'fifth'], 2),
    (['first', 'first', 'fifth'], 2),
    (['second', 'second', 'fifth'], 2),
    (['third', 'first', 'fifth'], 1),
    (['fourth', 'first', 'fifth'], 1)
]
INSTRUMENTS = ['organ', 'pipe_organ', 'organ', 'pipe_organ']
TICKS_PER_WHOLE = 480
DEFAULT_ATTEMPTS_PER_COMBO = 5000
DEFAULT_RESULTS_PER_COMBO = 5
DEFAULT_COMBO_CHUNK = 16
DEFAULT_WORKERS = max(8, min(24, (mp.cpu_count() or 4) * 3))


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


def has_generated_counterpoint(score: dict[str, Any]) -> bool:
    counterpoint_voices = [voice for voice in score.get('voices', []) if voice.get('role') == 'counterpoint']
    return bool(counterpoint_voices) and all(voice.get('notes') for voice in counterpoint_voices)


def random_species_combo(rng: random.Random) -> list[str]:
    total_weight = sum(weight for _, weight in SPECIES_COMBO_POOL)
    pick = rng.randrange(total_weight)
    running = 0
    for combo, weight in SPECIES_COMBO_POOL:
        running += weight
        if pick < running:
            return list(combo)
    return list(PREFERRED_SPECIES_COMBO)


def species_combo_label(species: list[str]) -> str:
    return '-'.join(species)


def random_combo_label(combo_index: int, mode: str, tonic: int, species: list[str]) -> str:
    return f'combo{combo_index:04d}_{mode}_t{tonic}_{species_combo_label(species)}'


def claim_combo_batch(combo_counter: mp.Value, combo_lock: mp.Lock, max_combos: int | None, chunk_size: int) -> list[int]:
    with combo_lock:
        if max_combos is not None and combo_counter.value >= max_combos:
            return []
        remaining = chunk_size if max_combos is None else max(0, max_combos - combo_counter.value)
        take = chunk_size if max_combos is None else min(chunk_size, remaining)
        start = combo_counter.value + 1
        combo_counter.value += take
        return list(range(start, start + take))


def search_worker(worker_id: int, config: dict[str, Any], combo_counter: mp.Value, combo_lock: mp.Lock) -> None:
    proc = start_worker()
    rng = random.Random(config['seed'] + worker_id * 1_000_003)
    seen: set[tuple[str, ...]] = set()
    try:
        while True:
            combo_batch = claim_combo_batch(combo_counter, combo_lock, config['max_combos'], config['combo_chunk_size'])
            if not combo_batch:
                return

            for combo_index in combo_batch:
                mode = rng.choice(MODES)
                tonic = rng.randrange(12)
                cp_species = random_species_combo(rng)
                combo_seed = rng.randrange(1_000_000_000)
                label = random_combo_label(combo_index, mode, tonic, cp_species)
                print(f'[worker {worker_id}] Searching {label} with {config["attempts_per_combo"]} attempts...', flush=True)

                saved_this_combo = 0
                for attempt_index in range(1, config['attempts_per_combo'] + 1):
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
                        print(f'[worker {worker_id}] attempt {attempt_index}: worker error: {response.get("error")}', file=sys.stderr, flush=True)
                        continue

                    evaluation = response['evaluation']
                    if evaluation.get('violations'):
                        continue

                    score = response['score']
                    if not has_generated_counterpoint(score):
                        print(f'[worker {worker_id}] attempt {attempt_index}: skipped empty counterpoint result.', file=sys.stderr, flush=True)
                        continue
                    if end_tick(score) != 4 * TICKS_PER_WHOLE:
                        continue

                    signature = score_signature(score)
                    if signature in seen:
                        continue
                    seen.add(signature)

                    assign_instruments(score)
                    score['title'] = f'{label}_a{attempt_index:04d}'
                    path = write_score(config['output_dir'], score, combo_index, attempt_index)
                    saved_this_combo += 1
                    print(f'[worker {worker_id}] saved {path.name}', flush=True)

                    if saved_this_combo >= config['results_per_combo']:
                        break

                if saved_this_combo == 0:
                    print(f'[worker {worker_id}] no zero-violation finds for this combination.', flush=True)
    finally:
        if proc.stdin is not None:
            proc.stdin.close()
        if proc.stdout is not None:
            proc.stdout.close()
        proc.terminate()


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Continuously search 4-voice combinations with balanced strictness and human-like generation heuristics.'
    )
    parser.add_argument('--attempts-per-combo', type=int, default=DEFAULT_ATTEMPTS_PER_COMBO)
    parser.add_argument('--results-per-combo', type=int, default=DEFAULT_RESULTS_PER_COMBO)
    parser.add_argument('--workers', type=int, default=DEFAULT_WORKERS)
    parser.add_argument('--combo-chunk-size', type=int, default=DEFAULT_COMBO_CHUNK)
    parser.add_argument('--max-combos', type=int, default=None, help='Stop after this many combinations instead of running forever.')
    parser.add_argument('--seed', type=int, default=1337)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    config = {
        'attempts_per_combo': args.attempts_per_combo,
        'results_per_combo': args.results_per_combo,
        'combo_chunk_size': max(1, args.combo_chunk_size),
        'max_combos': args.max_combos,
        'seed': args.seed,
        'output_dir': OUTPUT_DIR
    }

    if args.workers <= 1:
        combo_counter = mp.Value('i', 0)
        combo_lock = mp.Lock()
        search_worker(1, config, combo_counter, combo_lock)
        return 0

    ctx = mp.get_context('spawn')
    combo_counter = ctx.Value('i', 0)
    combo_lock = ctx.Lock()
    workers: list[mp.Process] = []
    try:
        for worker_id in range(1, args.workers + 1):
            process = ctx.Process(target=search_worker, args=(worker_id, config, combo_counter, combo_lock), daemon=False)
            process.start()
            workers.append(process)
        while any(process.is_alive() for process in workers):
            time.sleep(0.2)
        return 0
    except KeyboardInterrupt:
        print('\nStopping search.')
        return 0
    finally:
        for process in workers:
            if process.is_alive():
                process.terminate()
        for process in workers:
            process.join(timeout=1)


if __name__ == '__main__':
    raise SystemExit(main())
