import { modeDegreeToPc, type ModeName } from '../music/mode';
import { midiToPitchClass, midiToNoteName } from '../music/pitch';
import type { CounterpointScore, NoteEvent, Voice } from '../counterpoint/model';
import { SeededRandom } from './seededRandom';

export interface CantusOptions {
  mode: ModeName;
  tonicPitchClass: number;
  length: number;
  rangeMinMidi: number;
  rangeMaxMidi: number;
  seed: number;
  climaxPosition?: number;
}

function candidatesInRange(min: number, max: number, mode: ModeName, tonicPc: number): number[] {
  const out: number[] = [];
  for (let midi = min; midi <= max; midi += 1) {
    if (midiToPitchClass(midi) === modeDegreeToPc(mode, tonicPc, 1) || [0, 2, 4, 5, 7, 9, 11].includes(midiToPitchClass(midi))) {
      out.push(midi);
    }
  }
  return out;
}

export function generateCantusFirmus(options: CantusOptions): Voice {
  const rng = new SeededRandom(options.seed);
  const tonicCandidates = candidatesInRange(options.rangeMinMidi, options.rangeMaxMidi, options.mode, options.tonicPitchClass).filter((midi) => midiToPitchClass(midi) === options.tonicPitchClass);
  const start = tonicCandidates[Math.floor(tonicCandidates.length / 2)] ?? options.rangeMinMidi;
  const notes: NoteEvent[] = [
    { id: `cf-0`, midi: start, startTick: 0, durationTicks: 480 }
  ];
  const targetClimax = options.climaxPosition ?? Math.floor(options.length * 0.45);
  let current = start;
  for (let index = 1; index < options.length - 1; index += 1) {
    const moveBias = index < targetClimax ? 1 : -1;
    const steps = [1, 2, 2, 3, 4].map((step) => step * moveBias);
    const pool = steps
      .map((step) => current + step)
      .filter((midi) => midi >= options.rangeMinMidi && midi <= options.rangeMaxMidi && candidatesInRange(options.rangeMinMidi, options.rangeMaxMidi, options.mode, options.tonicPitchClass).includes(midi));
    const chosen = pool[Math.floor(rng.next() * pool.length)] ?? current;
    current = chosen;
    notes.push({ id: `cf-${index}`, midi: current, startTick: index * 480, durationTicks: 480 });
  }
  const finalMidi = tonicCandidates.find((midi) => Math.abs(midi - current) <= 7) ?? tonicCandidates[0] ?? start;
  notes.push({ id: `cf-${options.length - 1}`, midi: finalMidi, startTick: (options.length - 1) * 480, durationTicks: 480 });
  return {
    id: 'cf',
    name: 'Cantus Firmus',
    role: 'cantus',
    rangeMinMidi: options.rangeMinMidi,
    rangeMaxMidi: options.rangeMaxMidi,
    notes
  };
}
