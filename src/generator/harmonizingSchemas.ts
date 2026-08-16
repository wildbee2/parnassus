import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass } from '../music/pitch';
import type { CounterpointScore, NoteEvent, Voice } from '../counterpoint/model';

export interface HarmonizingSchemaContext {
  score: CounterpointScore;
  tick: number;
  override?: {
    voiceId: string;
    midi: number;
  };
}

export interface HarmonizingSchemaSignal {
  name:
    | 'stepwiseRomanesca'
    | 'leapingRomanesca'
    | 'prinner'
    | 'quiescenza'
    | 'simpleCadence'
    | 'compoundCadence'
    | 'galantCadence'
    | 'neapolitanCadence'
    | 'lamento'
    | 'fonte'
    | 'dominantChain'
    | 'descendingThirds';
  bonus: number;
}

export interface HarmonizingSchemaOccurrence {
  name: HarmonizingSchemaSignal['name'];
  label: string;
  startTick: number;
  endTick: number;
  signals: HarmonizingSchemaSignal[];
}

const SCHEMA_LABELS: Record<HarmonizingSchemaSignal['name'], string> = {
  stepwiseRomanesca: 'Romanesca',
  leapingRomanesca: 'Romanesca',
  prinner: 'Prinner',
  quiescenza: 'Quiescenza',
  simpleCadence: 'Cadence',
  compoundCadence: 'Cadence',
  galantCadence: 'Cadence',
  neapolitanCadence: 'Cadence',
  lamento: 'Lamento',
  fonte: 'Fonte',
  dominantChain: 'Dominant chain',
  descendingThirds: 'Descending thirds'
};

const SCHEMA_WINDOW_LENGTHS: Record<HarmonizingSchemaSignal['name'], number> = {
  stepwiseRomanesca: 4,
  leapingRomanesca: 4,
  prinner: 3,
  quiescenza: 4,
  simpleCadence: 2,
  compoundCadence: 2,
  galantCadence: 2,
  neapolitanCadence: 2,
  lamento: 3,
  fonte: 3,
  dominantChain: 3,
  descendingThirds: 3
};

function activeNoteForVoice(voice: Voice, tick: number, override?: HarmonizingSchemaContext['override']): NoteEvent | undefined {
  if (override && override.voiceId === voice.id) {
    return {
      id: `${voice.id}-override`,
      midi: override.midi,
      startTick: tick,
      durationTicks: 0
    };
  }
  return voice.notes.find((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks) ?? voice.notes.at(-1);
}

function activeSonority(context: HarmonizingSchemaContext): Array<{ voice: Voice; note: NoteEvent }> {
  return context.score.voices
    .map((voice) => ({ voice, note: activeNoteForVoice(voice, context.tick, context.override) }))
    .filter((entry): entry is { voice: Voice; note: NoteEvent } => Boolean(entry.note))
    .sort((a, b) => a.note.midi - b.note.midi);
}

function uniqueStructuralTicks(score: CounterpointScore, tick: number): number[] {
  return [...new Set(score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick)).filter((value) => value <= tick))].sort((a, b) => a - b);
}

function recentTicks(score: CounterpointScore, tick: number, count: number): number[] {
  return uniqueStructuralTicks(score, tick).slice(-count);
}

function noteDurationAtTick(score: CounterpointScore, tick: number): number {
  const note = score.voices
    .flatMap((voice) => voice.notes)
    .find((candidate) => candidate.startTick <= tick && tick < candidate.startTick + candidate.durationTicks);
  return note?.durationTicks ?? score.ticksPerWhole;
}

function bassAt(score: CounterpointScore, tick: number, override?: HarmonizingSchemaContext['override']): { voice: Voice; note: NoteEvent } | undefined {
  return activeSonority({ score, tick, override })[0];
}

function sopranoAt(score: CounterpointScore, tick: number, override?: HarmonizingSchemaContext['override']): { voice: Voice; note: NoteEvent } | undefined {
  const sonority = activeSonority({ score, tick, override });
  return sonority[sonority.length - 1];
}

function motionHistory(score: CounterpointScore, tick: number, override?: HarmonizingSchemaContext['override']): Array<{ tick: number; bass: number; soprano: number }> {
  return recentTicks(score, tick, 5)
    .map((currentTick) => {
      const bass = bassAt(score, currentTick, override);
      const soprano = sopranoAt(score, currentTick, override);
      if (!bass || !soprano) return null;
      return { tick: currentTick, bass: bass.note.midi, soprano: soprano.note.midi };
    })
    .filter((entry): entry is { tick: number; bass: number; soprano: number } => Boolean(entry));
}

function isStepDown(midiDiff: number): boolean {
  return midiDiff <= -1 && midiDiff >= -3;
}

function isStepUp(midiDiff: number): boolean {
  return midiDiff >= 1 && midiDiff <= 3;
}

function isDescendingThird(midiDiff: number): boolean {
  return midiDiff <= -3 && midiDiff >= -5;
}

function isDescendingFifth(midiDiff: number): boolean {
  return midiDiff <= -6 && midiDiff >= -8;
}

function isImperfectConsonanceInterval(interval: number): boolean {
  return interval === 3 || interval === 4 || interval === 8 || interval === 9;
}

function chromaticPitchClasses(score: CounterpointScore): number[] {
  return [
    (modeDegreeToPc(score.mode, score.tonicPitchClass, 2) + 11) % 12,
    (modeDegreeToPc(score.mode, score.tonicPitchClass, 4) + 1) % 12,
    (modeDegreeToPc(score.mode, score.tonicPitchClass, 6) + 11) % 12,
    (modeDegreeToPc(score.mode, score.tonicPitchClass, 7) + 1) % 12
  ];
}

function cadenceSignals(context: HarmonizingSchemaContext): HarmonizingSchemaSignal[] {
  const history = motionHistory(context.score, context.tick, context.override);
  if (history.length < 2) return [];
  const last = history.at(-1);
  const prev = history.at(-2);
  if (!last || !prev) return [];
  const bassMotion = last.bass - prev.bass;
  const sopranoMotion = last.soprano - prev.soprano;
  const finalPc = midiToPitchClass(last.soprano);
  const tonicPc = context.score.tonicPitchClass;
  const dominantPc = modeDegreeToPc(context.score.mode, tonicPc, 5);
  const signals: HarmonizingSchemaSignal[] = [];

  if (finalPc === tonicPc && (midiToPitchClass(last.bass) === tonicPc || midiToPitchClass(last.bass) === dominantPc)) {
    signals.push({ name: 'simpleCadence', bonus: 3.25 });
  }
  if (isStepDown(bassMotion) && isStepDown(sopranoMotion) && finalPc === tonicPc && midiToPitchClass(prev.bass) === dominantPc) {
    signals.push({ name: 'compoundCadence', bonus: 3 });
  }
  if (Math.abs(sopranoMotion) <= 2 && (midiToPitchClass(last.bass) === dominantPc || midiToPitchClass(prev.bass) === dominantPc) && finalPc === tonicPc) {
    signals.push({ name: 'galantCadence', bonus: 2.75 });
  }
  if (context.score.mode === 'aeolian' || context.score.mode === 'natural_minor') {
    const neapolitanPc = (modeDegreeToPc(context.score.mode, tonicPc, 2) + 11) % 12;
    if (chromaticPitchClasses(context.score).includes(neapolitanPc) || finalPc === neapolitanPc) {
      signals.push({ name: 'neapolitanCadence', bonus: 2.5 });
    }
  }

  return signals;
}

function romanescaSignals(context: HarmonizingSchemaContext): HarmonizingSchemaSignal[] {
  const history = motionHistory(context.score, context.tick, context.override);
  if (history.length < 4) return [];
  const recent = history.slice(-4);
  const bassMotions = recent.slice(1).map((entry, index) => entry.bass - recent[index]!.bass);
  const sopranoMotions = recent.slice(1).map((entry, index) => entry.soprano - recent[index]!.soprano);
  const sopranoIntervals = recent.map((entry) => Math.abs(entry.soprano - entry.bass) % 12);
  const alternatingThirdSixth = sopranoIntervals.every(isImperfectConsonanceInterval);
  const stepwiseDescent = bassMotions.every(isStepDown) && sopranoMotions.every(isStepDown);
  const leapingPattern = bassMotions.some((motion) => motion <= -4 && motion >= -8) && bassMotions.some(isStepUp);
  const signals: HarmonizingSchemaSignal[] = [];

  if (stepwiseDescent && alternatingThirdSixth) {
    signals.push({ name: 'stepwiseRomanesca', bonus: 4 });
  }
  if (leapingPattern && alternatingThirdSixth) {
    signals.push({ name: 'leapingRomanesca', bonus: 3 });
  }
  return signals;
}

function voiceLeadingSignals(context: HarmonizingSchemaContext): HarmonizingSchemaSignal[] {
  const history = motionHistory(context.score, context.tick, context.override);
  if (history.length < 3) return [];
  const recent = history.slice(-3);
  const bassMotions = recent.slice(1).map((entry, index) => entry.bass - recent[index]!.bass);
  const sopranoMotions = recent.slice(1).map((entry, index) => entry.soprano - recent[index]!.soprano);
  const chromaticClasses = chromaticPitchClasses(context.score);
  const currentSopranoPc = midiToPitchClass(recent.at(-1)!.soprano);
  const previousSopranoPc = midiToPitchClass(recent.at(-2)!.soprano);
  const tonicPc = context.score.tonicPitchClass;
  const signals: HarmonizingSchemaSignal[] = [];

  if (
    recent.every((entry) => midiToPitchClass(entry.bass) === tonicPc && entry.bass === recent[0]!.bass) &&
    sopranoMotions.every((motion) => isStepDown(motion) || isStepUp(motion) || motion === 0) &&
    (currentSopranoPc === tonicPc || chromaticClasses.includes(currentSopranoPc) || chromaticClasses.includes(previousSopranoPc))
  ) {
    signals.push({ name: 'quiescenza', bonus: 2.5 });
  }
  if (bassMotions.every((motion) => isStepDown(motion) || isDescendingThird(motion)) && sopranoMotions.every((motion) => isStepDown(motion) || motion === 0)) {
    signals.push({ name: 'prinner', bonus: 2.75 });
  }
  if (bassMotions.every(isDescendingThird)) {
    signals.push({ name: 'descendingThirds', bonus: 2.25 });
  }
  if (chromaticClasses.includes(currentSopranoPc) || chromaticClasses.includes(previousSopranoPc)) {
    signals.push({ name: 'lamento', bonus: 2.25 });
  }
  if (bassMotions.every(isDescendingFifth)) {
    signals.push({ name: 'dominantChain', bonus: 2.5 });
  }
  if (bassMotions.some(isDescendingFifth) && chromaticClasses.some((pc) => recent.some((entry) => midiToPitchClass(entry.soprano) === pc))) {
    signals.push({ name: 'fonte', bonus: 2 });
  }

  return signals;
}

export function scoreHarmonizingSchemas(context: HarmonizingSchemaContext): { bonus: number; signals: HarmonizingSchemaSignal[] } {
  const signals = [...romanescaSignals(context), ...voiceLeadingSignals(context), ...cadenceSignals(context)];
  const bonus = signals.reduce((sum, signal) => sum + signal.bonus, 0);
  return { bonus, signals };
}

export function detectHarmonizingSchemaOccurrences(score: CounterpointScore): HarmonizingSchemaOccurrence[] {
  const ticks = uniqueStructuralTicks(score, Number.POSITIVE_INFINITY);
  const occurrences: HarmonizingSchemaOccurrence[] = [];

  for (const tick of ticks) {
    const signals = scoreHarmonizingSchemas({ score, tick }).signals;
    if (!signals.length) continue;
    const tickIndex = ticks.indexOf(tick);

    for (const signal of signals) {
      const windowLength = SCHEMA_WINDOW_LENGTHS[signal.name];
      const startIndex = Math.max(0, tickIndex - windowLength + 1);
      const startTick = ticks[startIndex] ?? tick;
      const endTick = tick + noteDurationAtTick(score, tick);
      occurrences.push({
        name: signal.name,
        label: SCHEMA_LABELS[signal.name],
        startTick,
        endTick,
        signals: [signal]
      });
    }
  }

  occurrences.sort((a, b) => a.startTick - b.startTick || a.endTick - b.endTick || a.name.localeCompare(b.name));
  const merged: HarmonizingSchemaOccurrence[] = [];

  for (const occurrence of occurrences) {
    const last = merged.at(-1);
    if (last && last.name === occurrence.name && occurrence.startTick <= last.endTick) {
      last.endTick = Math.max(last.endTick, occurrence.endTick);
      last.signals.push(...occurrence.signals);
      continue;
    }
    merged.push({
      ...occurrence,
      signals: [...occurrence.signals]
    });
  }

  return merged;
}
