import { modeDegreeToPc, type ModeName } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { Candidate, CounterpointScore, Voice } from '../counterpoint/model';
import { classifyIntervalSemitones } from '../music/consonance';
import type { CounterpointSettings } from '../counterpoint/settings';
import { defaultCounterpointSettings, isMinorMode, melodicMinorSixthPitchClass } from '../counterpoint/settings';

export interface CandidateContext {
  score: CounterpointScore;
  voice: Voice;
  tick: number;
  previousMidi?: number;
  cfMidi?: number;
  species: NonNullable<Voice['species']>;
  mode: ModeName;
  settings?: Partial<CounterpointSettings>;
}

function pitchCandidatesInRange(min: number, max: number, mode: ModeName, tonicPc: number, settings: CounterpointSettings): number[] {
  const out: number[] = [];
  const modalPitchClasses = new Set<number>();
  for (let degree = 1; degree <= 7; degree += 1) {
    modalPitchClasses.add(modeDegreeToPc(mode, tonicPc, degree));
  }
  if (settings.heuristicMode === 'harmonizing') {
    modalPitchClasses.add((modeDegreeToPc(mode, tonicPc, 2) + 11) % 12);
    modalPitchClasses.add((modeDegreeToPc(mode, tonicPc, 4) + 1) % 12);
    modalPitchClasses.add((modeDegreeToPc(mode, tonicPc, 6) + 11) % 12);
    modalPitchClasses.add((modeDegreeToPc(mode, tonicPc, 7) + 1) % 12);
  }
  if (settings.permitMelodicMinorSixth && isMinorMode(mode)) {
    modalPitchClasses.add(melodicMinorSixthPitchClass(mode, tonicPc));
  }
  for (let midi = min; midi <= max; midi += 1) {
    if (modalPitchClasses.has(midiToPitchClass(midi))) {
      out.push(midi);
      continue;
    }
    if (settings.musicaFicta) {
      out.push(midi);
    }
  }
  return [...new Set(out)];
}

export function generateCandidates(context: CandidateContext): Candidate[] {
  const { score, voice, tick, previousMidi, cfMidi } = context;
  const settings = { ...defaultCounterpointSettings, ...(context.settings ?? {}) };
  const pool = pitchCandidatesInRange(voice.rangeMinMidi, voice.rangeMaxMidi, score.mode, score.tonicPitchClass, settings);
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
