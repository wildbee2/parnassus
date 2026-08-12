#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import random
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'simulations' / 'eval_worker.ts'
OUTPUT_DIR = ROOT / 'morphSearchFinds'

DEFAULT_TEMPLATE_TITLE = 'Four Voices - Bach Chorale Inspired'
DEFAULT_RESULTS = 10
DEFAULT_STEPS = 4000
DEFAULT_RESTARTS = 24
DEFAULT_BEAM_WIDTH = 6
DEFAULT_BRANCH_FACTOR = 6

VOICE_DELTA_CHOICES = [-1, 1, -2, 2, -3, 3, -4, 4]
VOICE_DELTA_WEIGHTS = [10, 10, 7, 7, 4, 4, 2, 2]
MODE_PITCH_CLASSES = {
    'ionian': {0, 2, 4, 5, 7, 9, 11},
    'dorian': {0, 2, 3, 5, 7, 9, 10},
    'phrygian': {0, 1, 3, 5, 7, 8, 10},
    'lydian': {0, 2, 4, 6, 7, 9, 11},
    'mixolydian': {0, 2, 4, 5, 7, 9, 10},
    'aeolian': {0, 2, 3, 5, 7, 8, 10},
    'major': {0, 2, 4, 5, 7, 9, 11},
    'natural_minor': {0, 2, 3, 5, 7, 8, 10}
}


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


def total_notes(score: dict[str, Any]) -> int:
    return sum(len(voice.get('notes', [])) for voice in score.get('voices', []))


def score_signature(score: dict[str, Any]) -> tuple[str, ...]:
    parts: list[str] = [score['mode'], str(score['tonicPitchClass']), str(score['ticksPerWhole'])]
    for voice in score.get('voices', []):
        parts.append(voice['id'])
        parts.append(voice.get('species') or '')
        parts.append(voice.get('instrument') or '')
        parts.extend(f"{note['midi']}@{note['startTick']}:{note['durationTicks']}" for note in voice.get('notes', []))
    return tuple(parts)


def voice_average_midi(voice: dict[str, Any]) -> float:
    notes = voice.get('notes', [])
    if not notes:
        return 0.0
    return sum(note['midi'] for note in notes) / len(notes)


def ordered_voices(score: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(score.get('voices', []), key=voice_average_midi)


def mode_pitch_classes(score: dict[str, Any]) -> set[int]:
    return MODE_PITCH_CLASSES.get(score['mode'], {0, 2, 4, 5, 7, 9, 11})


def note_in_mode(score: dict[str, Any], midi: int) -> bool:
    return midi % 12 in mode_pitch_classes(score)


def find_voice(score: dict[str, Any], voice_id: str) -> dict[str, Any] | None:
    return next((voice for voice in score.get('voices', []) if voice.get('id') == voice_id), None)


def note_index_by_id(voice: dict[str, Any], note_id: str | None) -> int | None:
    if note_id is None:
        return None
    for index, note in enumerate(voice.get('notes', [])):
        if note.get('id') == note_id:
            return index
    return None


def expand_range_for_cadence(voice: dict[str, Any], target_midi: int) -> None:
    note_midis = [note['midi'] for note in voice.get('notes', [])]
    if note_midis:
        voice['rangeMinMidi'] = min([voice.get('rangeMinMidi', target_midi), *note_midis, target_midi]) - 2
        voice['rangeMaxMidi'] = max([voice.get('rangeMaxMidi', target_midi), *note_midis, target_midi]) + 2
    else:
        voice['rangeMinMidi'] = target_midi - 4
        voice['rangeMaxMidi'] = target_midi + 4


def force_octave_cadence(score: dict[str, Any]) -> None:
    voices = ordered_voices(score)
    if not voices:
        return

    tonic_pc = score['tonicPitchClass'] % 12
    base_midi = 48 + ((tonic_pc - 48) % 12)
    cadence_midis = [base_midi + index * 12 for index in range(len(voices))]

    for voice, target_midi in zip(voices, cadence_midis):
        notes = voice.get('notes', [])
        if not notes:
            continue
        notes[-1]['midi'] = target_midi
        expand_range_for_cadence(voice, target_midi)


def clone_score(score: dict[str, Any]) -> dict[str, Any]:
    return copy.deepcopy(score)


def create_seed_score(example: dict[str, Any]) -> dict[str, Any]:
    score = clone_score(example)
    force_octave_cadence(score)
    return score


def best_example_from_worker(proc: subprocess.Popen[str], title: str | None) -> dict[str, Any]:
    response = send_request(proc, {'type': 'examples'})
    if not response.get('ok'):
        raise RuntimeError(f"Failed to load built-in examples: {response.get('error')}")

    examples = response.get('examples', [])
    candidates = [
        item
        for item in examples
        if len(item['score'].get('voices', [])) == 4
    ]
    if not candidates:
        raise RuntimeError('No suitable 4-voice examples were found.')

    if title:
        for candidate in candidates:
            if candidate['score'].get('title') == title:
                return candidate['score']

    candidates.sort(
        key=lambda item: (
            len(item.get('evaluation', {}).get('violations', [])),
            -item.get('evaluation', {}).get('score', 0),
            -item.get('totalNotes', 0),
            -item.get('endTick', 0)
        )
    )
    return candidates[0]['score']


def evaluate_score(proc: subprocess.Popen[str], score: dict[str, Any]) -> dict[str, Any]:
    response = send_request(proc, {'type': 'evaluate', 'payload': score})
    if not response.get('ok'):
        raise RuntimeError(f"Worker evaluation failed: {response.get('error')}")
    return response['evaluation']


def candidate_note_indices(score: dict[str, Any]) -> list[int]:
    if not score.get('voices'):
        return []
    note_count = min(len(voice.get('notes', [])) for voice in score['voices'] if voice.get('notes'))
    if note_count <= 1:
        return []
    # Work backward from the cadence, but never change the locked final bar.
    return list(range(note_count - 2, -1, -1))


def pick_mutation_target(score: dict[str, Any], rng: random.Random) -> tuple[dict[str, Any], int] | tuple[None, None]:
    voices = [voice for voice in score.get('voices', []) if voice.get('notes')]
    if not voices:
        return None, None

    inner_voices = [voice for voice in voices if voice.get('role') == 'counterpoint']
    candidate_voices = inner_voices if inner_voices else voices
    voice = rng.choice(candidate_voices)
    note_indices = candidate_note_indices(score)
    if not note_indices:
        return None, None

    # Bias toward later bars so the search works backwards from the cadence.
    weighted_indices = []
    for index in note_indices:
        weight = len(note_indices) - note_indices.index(index)
        weighted_indices.extend([index] * weight)
    note_index = rng.choice(weighted_indices)
    return voice, note_index


def mutate_score(score: dict[str, Any], rng: random.Random) -> dict[str, Any] | None:
    candidate = clone_score(score)
    voice, note_index = pick_mutation_target(candidate, rng)
    if voice is None or note_index is None:
        return None

    notes = voice.get('notes', [])
    if note_index >= len(notes) - 1:
        return None

    note = notes[note_index]
    delta = rng.choices(VOICE_DELTA_CHOICES, weights=VOICE_DELTA_WEIGHTS, k=1)[0]
    new_midi = note['midi'] + delta
    if new_midi < voice['rangeMinMidi'] or new_midi > voice['rangeMaxMidi']:
        return None

    note['midi'] = new_midi
    force_octave_cadence(candidate)
    return candidate


def tweak_note(candidate: dict[str, Any], voice_id: str, note_index: int, delta: int) -> bool:
    voice = find_voice(candidate, voice_id)
    if voice is None:
        return False
    notes = voice.get('notes', [])
    if note_index < 0 or note_index >= len(notes) - 1:
        return False
    note = notes[note_index]
    new_midi = note['midi'] + delta
    if new_midi < voice['rangeMinMidi'] or new_midi > voice['rangeMaxMidi']:
        return False
    if not note_in_mode(candidate, new_midi):
        return False
    note['midi'] = new_midi
    return True


def prefix_shape(length: int, kind: str, magnitude: int) -> list[int]:
    if length <= 0:
        return []
    if kind == 'shift':
        return [magnitude] * length
    if kind == 'rise':
        if length == 1:
            return [magnitude]
        return [round(magnitude * index / (length - 1)) for index in range(length)]
    if kind == 'fall':
        if length == 1:
            return [magnitude]
        return [round(magnitude * (length - 1 - index) / (length - 1)) for index in range(length)]
    if kind == 'arch':
        midpoint = (length - 1) / 2
        return [round(magnitude * (1 - abs(index - midpoint) / max(1, midpoint))) for index in range(length)]
    if kind == 'dip':
        midpoint = (length - 1) / 2
        return [round(-magnitude * (1 - abs(index - midpoint) / max(1, midpoint))) for index in range(length)]
    return [0] * length


def apply_prefix_shape(candidate: dict[str, Any], voice_id: str, cutoff: int, shape: list[int]) -> bool:
    voice = find_voice(candidate, voice_id)
    if voice is None:
        return False
    notes = voice.get('notes', [])
    if cutoff <= 0 or cutoff > len(notes) - 1:
        return False
    for index in range(cutoff):
        new_midi = notes[index]['midi'] + shape[index]
        if new_midi < voice['rangeMinMidi'] or new_midi > voice['rangeMaxMidi']:
            return False
        if not note_in_mode(candidate, new_midi):
            return False
    for index in range(cutoff):
        notes[index]['midi'] += shape[index]
    return True


def apply_pair_prefix_shift(candidate: dict[str, Any], voice_a: str, voice_b: str, cutoff: int, delta_a: int, delta_b: int) -> bool:
    ok_a = apply_prefix_shape(candidate, voice_a, cutoff, prefix_shape(cutoff, 'shift', delta_a))
    ok_b = apply_prefix_shape(candidate, voice_b, cutoff, prefix_shape(cutoff, 'shift', delta_b))
    return ok_a and ok_b


def early_structural_candidates(score: dict[str, Any], rng: random.Random) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    voices = [voice for voice in score.get('voices', []) if voice.get('notes')]
    counterpoint_voices = [voice for voice in voices if voice.get('role') == 'counterpoint']
    if not counterpoint_voices:
        return candidates

    note_count = min(len(voice.get('notes', [])) for voice in voices)
    if note_count < 3:
        return candidates

    cutoff_choices = list(range(2, min(note_count - 1, max(3, note_count // 2)) + 1))
    if not cutoff_choices:
        return candidates

    shape_specs = [
        ('shift', 1), ('shift', -1), ('shift', 2), ('shift', -2),
        ('rise', 2), ('rise', -2), ('fall', 2), ('fall', -2),
        ('arch', 2), ('arch', -2), ('dip', 2), ('dip', -2)
    ]

    focus_voices = counterpoint_voices[:]
    rng.shuffle(focus_voices)
    for voice in focus_voices[: min(3, len(focus_voices))]:
        for cutoff in cutoff_choices[:3]:
            for kind, magnitude in shape_specs:
                candidate = clone_score(score)
                shape = prefix_shape(cutoff, kind, magnitude)
                if apply_prefix_shape(candidate, voice['id'], cutoff, shape):
                    force_octave_cadence(candidate)
                    candidates.append(candidate)

    if len(counterpoint_voices) >= 2:
        paired = [
            (counterpoint_voices[0]['id'], counterpoint_voices[1]['id']),
            (counterpoint_voices[-2]['id'], counterpoint_voices[-1]['id'])
        ]
        for voice_a, voice_b in paired:
            for cutoff in cutoff_choices[:3]:
                for delta_a, delta_b in [(-2, 2), (-1, 1), (1, -1), (2, -2), (-3, 1), (1, -3)]:
                    candidate = clone_score(score)
                    if apply_pair_prefix_shift(candidate, voice_a, voice_b, cutoff, delta_a, delta_b):
                        force_octave_cadence(candidate)
                        candidates.append(candidate)

    return candidates


def propose_repair_candidates(score: dict[str, Any], evaluation: dict[str, Any], rng: random.Random) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    deltas = [1, -1, 2, -2, 3, -3]
    violations = evaluation.get('violations', [])
    for violation in violations[:6]:
        voice_ids = violation.get('voiceIds', [])
        note_ids = violation.get('noteIds', []) or []

        for voice_id in voice_ids:
            voice = find_voice(score, voice_id)
            if voice is None:
                continue
            notes = voice.get('notes', [])
            if len(notes) < 2:
                continue

            indices: list[int] = []
            for note_id in note_ids:
                if note_id.startswith(f'{voice_id}-'):
                    note_index = note_index_by_id(voice, note_id)
                    if note_index is not None:
                        indices.append(note_index)

            if not indices:
                indices = [len(notes) - 2]

            if violation.get('ruleId') == 'MEL_REPEATED_NOTES':
                indices = sorted(set(max(0, min(index, len(notes) - 2)) for index in indices))
            else:
                indices = sorted(set(max(0, min(index, len(notes) - 2)) for index in indices))
                if len(notes) >= 3:
                    indices.append(len(notes) - 3)

            for index in indices:
                if index >= len(notes) - 1:
                    continue
                for delta in deltas:
                    candidate = clone_score(score)
                    if tweak_note(candidate, voice_id, index, delta):
                        force_octave_cadence(candidate)
                        candidates.append(candidate)

        if len(voice_ids) >= 2:
            paired_candidates = []
            pair_indices: list[int] = []
            for voice_id in voice_ids[:2]:
                voice = find_voice(score, voice_id)
                if voice is None or len(voice.get('notes', [])) < 2:
                    continue
                indices = [note_index_by_id(voice, note_id) for note_id in note_ids if note_id.startswith(f'{voice_id}-')]
                indices = [index for index in indices if index is not None]
                if indices:
                    pair_indices.append(max(0, min(min(indices), len(voice['notes']) - 2)))
                else:
                    pair_indices.append(len(voice['notes']) - 2)
            if len(pair_indices) == 2:
                for delta_a, delta_b in [(-1, 1), (1, -1), (-2, 1), (1, -2), (-1, 2), (2, -1)]:
                    candidate = clone_score(score)
                    if tweak_note(candidate, voice_ids[0], pair_indices[0], delta_a) and tweak_note(candidate, voice_ids[1], pair_indices[1], delta_b):
                        force_octave_cadence(candidate)
                        paired_candidates.append(candidate)
                candidates.extend(paired_candidates)

    # Add a few blind mutations so we can escape a bad local repair.
    for _ in range(8):
        candidate = mutate_score(score, random.Random(rng.randrange(1_000_000_000)))
        if candidate is not None:
            candidates.append(candidate)

    # Structural early-bar rewrites give the beam a chance to escape local minima.
    candidates.extend(early_structural_candidates(score, random.Random(rng.randrange(1_000_000_000))))

    return candidates


def compare_scores(a: dict[str, Any], b: dict[str, Any]) -> int:
    a_violations = len(a.get('violations', []))
    b_violations = len(b.get('violations', []))
    if a_violations != b_violations:
        return -1 if a_violations < b_violations else 1
    a_score = a.get('score', 0)
    b_score = b.get('score', 0)
    if a_score != b_score:
        return -1 if a_score > b_score else 1
    return 0


def score_sort_key(item: tuple[dict[str, Any], dict[str, Any]]) -> tuple[int, int, int, int]:
    score, evaluation = item
    return (
        len(evaluation.get('violations', [])),
        -evaluation.get('score', 0),
        -total_notes(score),
        -len(score.get('voices', []))
    )


def dedupe_and_rank(
    candidates: list[tuple[dict[str, Any], dict[str, Any]]],
    seen_signatures: set[tuple[str, ...]],
    beam_width: int
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    ranked: list[tuple[dict[str, Any], dict[str, Any]]] = []
    local_seen: set[tuple[str, ...]] = set()
    for score, evaluation in sorted(candidates, key=score_sort_key):
        signature = score_signature(score)
        if signature in seen_signatures or signature in local_seen:
            continue
        local_seen.add(signature)
        ranked.append((score, evaluation))
        if len(ranked) >= beam_width:
            break
    return ranked


def write_score(output_dir: Path, score: dict[str, Any], index: int, label: str) -> Path:
    path = output_dir / f'{label}_{index:04d}.json'
    with path.open('w', encoding='utf-8') as handle:
        json.dump(score, handle, indent=2)
        handle.write('\n')
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description='Morph a known 4-voice solution backward from an octave-spaced cadence.')
    parser.add_argument('--seed', type=int, default=1337)
    parser.add_argument('--results', type=int, default=DEFAULT_RESULTS)
    parser.add_argument('--restarts', type=int, default=DEFAULT_RESTARTS)
    parser.add_argument('--steps', type=int, default=DEFAULT_STEPS)
    parser.add_argument('--beam-width', type=int, default=DEFAULT_BEAM_WIDTH)
    parser.add_argument('--branch-factor', type=int, default=DEFAULT_BRANCH_FACTOR)
    parser.add_argument('--template-title', default=DEFAULT_TEMPLATE_TITLE)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    proc = start_worker()
    rng = random.Random(args.seed)
    seen: set[tuple[str, ...]] = set()

    try:
        seed_example = best_example_from_worker(proc, args.template_title)
        base_template = create_seed_score(seed_example)
        best_score = base_template
        best_eval = evaluate_score(proc, best_score)
        saved = 0
        explored: set[tuple[str, ...]] = set()

        if best_eval.get('violations') == []:
            signature = score_signature(best_score)
            seen.add(signature)
            path = write_score(OUTPUT_DIR, best_score, saved + 1, 'seed')
            print(f'saved seed {path.name}')
            saved += 1
        explored.add(score_signature(best_score))

        for restart in range(1, args.restarts + 1):
            beam_seed = clone_score(base_template)
            beam: list[tuple[dict[str, Any], dict[str, Any]]] = [(beam_seed, evaluate_score(proc, beam_seed))]
            for score, evaluation in beam:
                explored.add(score_signature(score))

            for step in range(1, args.steps + 1):
                expanded: list[tuple[dict[str, Any], dict[str, Any]]] = []
                for parent_score, parent_eval in beam:
                    proposals = propose_repair_candidates(parent_score, parent_eval, rng)
                    if not proposals:
                        continue

                    evaluated: list[tuple[dict[str, Any], dict[str, Any]]] = []
                    for proposal in proposals:
                        signature = score_signature(proposal)
                        if signature in explored:
                            continue
                        proposal_eval = evaluate_score(proc, proposal)
                        evaluated.append((proposal, proposal_eval))

                    if not evaluated:
                        continue

                    evaluated.sort(key=score_sort_key)
                    expanded.extend(evaluated[: max(1, args.branch_factor)])

                if not expanded:
                    continue

                beam = dedupe_and_rank(expanded, explored, max(1, args.beam_width))
                if not beam:
                    continue

                for score, evaluation in beam:
                    explored.add(score_signature(score))
                    if evaluation.get('violations') == []:
                        signature = score_signature(score)
                        if signature not in seen:
                            seen.add(signature)
                            path = write_score(OUTPUT_DIR, score, saved + 1, f'restart{restart:02d}')
                            print(f'saved {path.name}')
                            saved += 1
                            if saved >= args.results:
                                return 0

                top_score, top_eval = beam[0]
                if compare_scores(top_eval, best_eval) < 0:
                    best_score = top_score
                    best_eval = top_eval
                    print(f'restart {restart}: best score now {best_eval.get("score", 0)} with {len(best_eval.get("violations", []))} violations')

                if any(evaluation.get('violations') == [] for _, evaluation in beam):
                    break

        if saved == 0:
            print('No zero-violation descendants were found.')
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
