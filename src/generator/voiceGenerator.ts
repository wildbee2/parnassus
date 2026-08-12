import { classifyIntervalSemitones } from '../music/consonance';
import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, GenerationStyle, NoteEvent, Voice } from '../counterpoint/model';
import { SeededRandom } from './seededRandom';
import { scoreCandidate } from './phraseScoring';
import { generateCandidates } from './candidateGenerator';
import { speciesDurationAtIndex } from '../counterpoint/species';

export interface VoiceGenerationOptions {
  score: CounterpointScore;
  voice: Voice;
  seed: number;
  lockedNotes?: NoteEvent[];
  heuristicMode?: GenerationStyle;
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
  const { score, voice, seed, heuristicMode = 'strict' } = options;
  const rng = new SeededRandom(seed);
  const cf = score.voices.find((v) => v.role === 'cantus');
  const source = cf ?? score.voices[0];
  const targetEndTick = source.notes.reduce((maxTick, note) => Math.max(maxTick, note.startTick + note.durationTicks), 0);
  const notes: NoteEvent[] = [];
  let previousMidi = (voice.position === 'below' ? voice.rangeMaxMidi : voice.rangeMinMidi) + 0;
  let noteIndex = 0;
  let tick = 0;

  while (tick < targetEndTick) {
    const cfNote = source.notes.find((candidate) => candidate.startTick <= tick && tick < candidate.startTick + candidate.durationTicks) ?? source.notes[source.notes.length - 1];
    const cfMidi = cfNote?.midi;
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
          tick,
          generationStyle: heuristicMode
        })
      }))
      .sort((a, b) => b.score - a.score);
    const chosen = (() => {
      if (!ranked.length) return cfMidi ?? voice.rangeMinMidi;
      if (heuristicMode !== 'humanLike' || ranked.length === 1) {
        return ranked[0].midi;
      }
      if (noteIndex === 0) {
        return ranked[0].midi;
      }
      const top = ranked.slice(0, Math.min(5, ranked.length));
      const shortlist = noteIndex === 1 ? top.slice(0, Math.min(3, top.length)) : top;
      const floor = shortlist[shortlist.length - 1].score;
      const weights = shortlist.map((entry) => Math.max(0.1, entry.score - floor + (noteIndex === 1 ? 1 : 0.5)));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      let roll = rng.next() * total;
      for (let index = 0; index < shortlist.length; index += 1) {
        roll -= weights[index];
        if (roll <= 0) return shortlist[index].midi;
      }
      return shortlist[0].midi;
    })();
    const durationTicks = Math.min(speciesDurationAtIndex(voice.species, noteIndex, score.ticksPerWhole), targetEndTick - tick);
    notes.push({
      id: `${voice.id}-${noteIndex}`,
      midi: chosen,
      startTick: tick,
      durationTicks,
      tiedFromPrevious: voice.species === 'fourth' && noteIndex > 0 ? true : undefined,
      tiedToNext: voice.species === 'fourth' && tick + durationTicks < targetEndTick ? true : undefined
    });
    previousMidi = chosen;
    tick += durationTicks;
    noteIndex += 1;
  }
  return { ...voice, notes };
}
