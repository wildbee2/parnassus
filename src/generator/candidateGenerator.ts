import { modeDegreeToPc, type ModeName } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { Candidate, CounterpointScore, Voice } from '../counterpoint/model';
import { classifyIntervalSemitones } from '../music/consonance';

export interface CandidateContext {
  score: CounterpointScore;
  voice: Voice;
  tick: number;
  previousMidi?: number;
  cfMidi?: number;
  species: NonNullable<Voice['species']>;
  mode: ModeName;
}

function pitchCandidatesInRange(min: number, max: number, mode: ModeName, tonicPc: number): number[] {
  const out: number[] = [];
  for (let midi = min; midi <= max; midi += 1) {
    if (midiToPitchClass(midi) === tonicPc || modeDegreeToPc(mode, tonicPc, 1) === midiToPitchClass(midi)) {
      out.push(midi);
      continue;
    }
    const pcs = [0, 1, 2, 3, 4, 5, 6];
    if (pcs.some((degree) => modeDegreeToPc(mode, tonicPc, degree + 1) === midiToPitchClass(midi))) out.push(midi);
  }
  return [...new Set(out)];
}

export function generateCandidates(context: CandidateContext): Candidate[] {
  const { score, voice, tick, previousMidi, cfMidi } = context;
  const pool = pitchCandidatesInRange(voice.rangeMinMidi, voice.rangeMaxMidi, score.mode, score.tonicPitchClass);
  const candidates: Candidate[] = [];
  const finalTick = Math.max(...score.voices.flatMap((v) => v.notes.map((n) => n.startTick + n.durationTicks)), score.ticksPerWhole);
  const isFinal = tick + score.ticksPerWhole >= finalTick;

  for (const midi of pool) {
    const interval = cfMidi === undefined ? undefined : classifyIntervalSemitones(midi - cfMidi, true);
    const consonant = interval ? interval !== 'dissonant' : true;
    if (voice.species === 'first' && !consonant) continue;
    if (previousMidi !== undefined) {
      const leap = Math.abs(midi - previousMidi);
      if (leap > 12) continue;
    }
    candidates.push({ midi, durationTicks: score.ticksPerWhole });
  }
  return candidates;
}
