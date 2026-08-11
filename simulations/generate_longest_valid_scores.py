#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'simulations' / 'eval_worker.ts'
OUTPUT_DIR = ROOT / 'simulations' / 'output'

MODES = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian']
SPECIES_PAIRS = [
    ('first', 'first'),
    ('first', 'second'),
    ('second', 'first'),
    ('second', 'second'),
    ('first', 'third'),
    ('third', 'first')
]
SPECIES_CHOICES = ['first', 'second', 'third', 'fourth', 'fifth']
STRICTNESSES = ['strict', 'balanced', 'permissive']


@dataclass(frozen=True)
class SearchConfig:
    min_length: int = 6
    max_length: int = 14
    attempts_per_length: int = 8
    max_outputs: int = 5
    seed: int = 1337
    counterpoint_voices: int = 2
    heuristic_mode: str = 'strict'


def start_worker() -> subprocess.Popen[str]:
    return subprocess.Popen(
        ['node_modules/.bin/vite-node', '--script', str(WORKER)],
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
        parts.extend(
            f"{note['midi']}@{note['startTick']}:{note['durationTicks']}"
            for note in voice.get('notes', [])
        )
    return tuple(parts)


def total_notes(score: dict[str, Any]) -> int:
    return sum(len(voice.get('notes', [])) for voice in score.get('voices', []))


def end_tick(score: dict[str, Any]) -> int:
    return max(
        (note['startTick'] + note['durationTicks'] for voice in score.get('voices', []) for note in voice.get('notes', [])),
        default=0
    )


def write_score(output_dir: Path, score: dict[str, Any], index: int) -> Path:
    notes = total_notes(score)
    length = len(score['voices'][0]['notes']) if score.get('voices') else 0
    mode = score.get('mode', 'unknown')
    species = '-'.join(voice.get('species') or 'none' for voice in score.get('voices', []) if voice.get('role') == 'counterpoint')
    seed = score.get('seed', 'seed')
    filename = f'len{length:02d}_notes{notes:03d}_{mode}_{species}_{seed}_{index + 1}.json'
    path = output_dir / filename
    with path.open('w', encoding='utf-8') as handle:
        json.dump(score, handle, indent=2)
        handle.write('\n')
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description='Search for long zero-violation counterpoint examples.')
    parser.add_argument('--min-length', type=int, default=SearchConfig.min_length)
    parser.add_argument('--max-length', type=int, default=SearchConfig.max_length)
    parser.add_argument('--attempts-per-length', type=int, default=SearchConfig.attempts_per_length)
    parser.add_argument('--max-outputs', type=int, default=SearchConfig.max_outputs)
    parser.add_argument('--seed', type=int, default=SearchConfig.seed)
    parser.add_argument('--counterpoint-voices', type=int, default=SearchConfig.counterpoint_voices)
    parser.add_argument('--heuristic-mode', choices=['strict', 'humanLike'], default=SearchConfig.heuristic_mode)
    parser.add_argument('--search', action='store_true', help='Also run a generator search after seeding from built-in examples.')
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for candidate in OUTPUT_DIR.glob('*.json'):
        candidate.unlink()

    rng = random.Random(args.seed)
    proc = start_worker()
    winners: list[dict[str, Any]] = []
    seen: set[tuple[str, ...]] = set()

    try:
        examples_response = send_request(proc, {'type': 'examples'})
        if not examples_response.get('ok'):
            print(f"Failed to load built-in examples: {examples_response.get('error')}", file=sys.stderr)
            return 1

        built_in_candidates = [
            item for item in examples_response.get('examples', [])
            if item['evaluation'].get('violations') == [] and sum(1 for voice in item['score']['voices'] if voice['role'] == 'counterpoint') == args.counterpoint_voices
        ]
        built_in_candidates.sort(key=lambda item: (item['endTick'], item['totalNotes']), reverse=True)
        for item in built_in_candidates[: args.max_outputs]:
            signature = score_signature(item['score'])
            if signature in seen:
                continue
            seen.add(signature)
            winners.append(item['score'])

        if not args.search:
            if not winners:
                print('No zero-violation built-in examples were found.')
                return 1
            saved_paths = [write_score(OUTPUT_DIR, score, index) for index, score in enumerate(winners)]
            print(f'Saved {len(saved_paths)} score(s) to {OUTPUT_DIR}')
            for path in saved_paths:
                print(f'  {path.name}')
            return 0

        best_cf_length = max((len(score['voices'][0]['notes']) for score in winners), default=0)

        for length in range(args.max_length, max(args.min_length - 1, best_cf_length), -1):
            print(f'Searching length {length}...')
            length_winners: list[dict[str, Any]] = []
            for attempt in range(args.attempts_per_length):
                mode = rng.choice(MODES)
                tonic = rng.randrange(12)
                if args.counterpoint_voices == 1:
                    cp_species = [rng.choice(SPECIES_CHOICES)]
                elif args.counterpoint_voices == 2:
                    cp_species = list(rng.choice(SPECIES_PAIRS))
                else:
                    cp_species = [rng.choice(SPECIES_CHOICES) for _ in range(args.counterpoint_voices)]
                strictness = rng.choice(STRICTNESSES)
                cp_descriptor = '-'.join(cp_species)
                payload = {
                    'type': 'generate',
                    'payload': {
                        'id': f'{length}-{attempt}-{mode}-{tonic}-{cp_descriptor}-{strictness}',
                        'mode': mode,
                        'tonicPitchClass': tonic,
                        'length': length,
                        'seed': args.seed + length * 10000 + attempt * 97,
                        'strictness': strictness,
                        'heuristicMode': args.heuristic_mode,
                        'cfRangeMinMidi': 50,
                        'cfRangeMaxMidi': 69,
                        'counterpointVoices': args.counterpoint_voices,
                        'cpSpecies': cp_species
                    }
                }
                response = send_request(proc, payload)
                if not response.get('ok'):
                    print(f"  attempt {attempt + 1}: worker error: {response.get('error')}", file=sys.stderr)
                    continue

                evaluation = response['evaluation']
                if evaluation.get('violations'):
                    continue

                score = response['score']
                signature = score_signature(score)
                if signature in seen:
                    continue
                seen.add(signature)
                length_winners.append(score)
                print(
                    f"  found zero-violation score: notes={total_notes(score)} endTick={end_tick(score)} "
                    f"mode={score['mode']} cp={','.join(cp_species)} strictness={strictness}"
                )
                if len(length_winners) >= args.max_outputs:
                    break

            if length_winners:
                if not winners or len(length_winners[0]['voices'][0]['notes']) > len(winners[0]['voices'][0]['notes']):
                    winners = length_winners
                break

        if not winners:
            print('No zero-violation scores were found.')
            return 1

        saved_paths = [write_score(OUTPUT_DIR, score, index) for index, score in enumerate(winners)]
        print(f'Saved {len(saved_paths)} score(s) to {OUTPUT_DIR}')
        for path in saved_paths:
            print(f'  {path.name}')
        return 0
    finally:
        if proc.stdin is not None:
            proc.stdin.close()
        if proc.stdout is not None:
            proc.stdout.close()
        proc.terminate()


if __name__ == '__main__':
    raise SystemExit(main())
