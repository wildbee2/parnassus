import { classifyIntervalSemitones } from '../music/consonance';
import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, NoteEvent, Voice } from '../counterpoint/model';
import { SeededRandom } from './seededRandom';
import { scoreCandidate } from './phraseScoring';
import { generateCandidates } from './candidateGenerator';
import { speciesDurations } from '../counterpoint/species';

export interface VoiceGenerationOptions {
  score: CounterpointScore;
  voice: Voice;
  seed: number;
  lockedNotes?: NoteEvent[];
}

function sortUnique(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function candidateIsAllowed(midi: number, existing: Voice[], tick: number, voice: Voice, score: CounterpointScore): boolean {
  for (const other of existing) {
    const active = other.notes.find((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    if (!active) continue;
    const interval = classifyIntervalSemitones(midi - active.midi, true);
    if (voice.species === 'first' && interval === 'dissonant') return false;
    if (tick % score.ticksPerWhole === 0 && interval === 'dissonant' && voice.species !== 'fifth') return false;
  }
  return true;
}

export function generateVoice(options: VoiceGenerationOptions): Voice {
  const { score, voice, seed } = options;
  const rng = new SeededRandom(seed);
  const cf = score.voices.find((v) => v.role === 'cantus');
  const source = cf ?? score.voices[0];
  const noteCount = source.notes.length;
  const durations = speciesDurations(voice.species, score.ticksPerWhole);
  const notes: NoteEvent[] = [];
  let previousMidi = (voice.position === 'below' ? voice.rangeMaxMidi : voice.rangeMinMidi) + 0;
  for (let i = 0; i < noteCount; i += 1) {
    const tick = source.notes[i]?.startTick ?? i * score.ticksPerWhole;
    const cfMidi = source.notes[i]?.midi;
    const candidates = generateCandidates({
      score,
      voice,
      tick,
      previousMidi: notes.at(-1)?.midi ?? previousMidi,
      cfMidi,
      species: voice.species ?? 'first',
      mode: score.mode
    }).map((candidate) => candidate.midi);
    const legal = sortUnique(candidates.filter((midi) => candidateIsAllowed(midi, score.voices.filter((v) => v.id !== voice.id), tick, voice, score)));
    const ranked = legal
      .map((midi) => ({
        midi,
        score: scoreCandidate({
          score,
          voice,
          midi,
          previousMidi: notes.at(-1)?.midi ?? undefined,
          cfMidi,
          tick
        })
      }))
      .sort((a, b) => b.score - a.score);
    const chosen = ranked[0]?.midi ?? cfMidi ?? voice.rangeMinMidi;
    const durationTicks = durations[i % durations.length];
    notes.push({
      id: `${voice.id}-${i}`,
      midi: chosen,
      startTick: tick,
      durationTicks,
      tiedFromPrevious: voice.species === 'fourth' && i > 0 ? true : undefined,
      tiedToNext: voice.species === 'fourth' && i < noteCount - 1 ? true : undefined
    });
    previousMidi = chosen;
  }
  return { ...voice, notes };
}
