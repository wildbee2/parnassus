import { analyzeCadence } from '../../music/cadence';
import { classifyIntervalSemitones, isDissonance } from '../../music/consonance';
import { beatLabelFromTick } from '../../music/rhythm';
import { intervalInfo } from '../../music/interval';
import { classifyMotion, isHiddenPerfect, isPerfectIntervalSemitoneClass } from '../../music/motion';
import { midiToNoteName } from '../../music/pitch';
import type {
  CounterpointRule,
  CounterpointScore,
  NoteEvent,
  RuleContext,
  RuleMetadata,
  RuleViolation,
  SuggestedFix,
  Voice
} from '../model';

type NoteAtTick = { voice: Voice; note: NoteEvent };

const severityFor = (ruleId: string) => {
  if (ruleId.startsWith('HAR_PARALLEL') || ruleId.startsWith('HAR_DIRECT') || ruleId.startsWith('SP4_UNPREPARED') || ruleId.startsWith('SP4_UNRESOLVED') || ruleId.startsWith('SP2_BAD') || ruleId.startsWith('SP3_BAD') || ruleId.startsWith('SP5_BAD')) {
    return 'error' as const;
  }
  if (ruleId.startsWith('MEL_') || ruleId.startsWith('TEX_') || ruleId.startsWith('CAD_')) return 'warning' as const;
  return 'info' as const;
};

const meta = (
  id: string,
  title: string,
  summary: string,
  detailedExplanation: string,
  species: RuleMetadata['species'],
  configurable = true,
  category: RuleMetadata['category'] = 'texture'
): RuleMetadata => ({
  id,
  title,
  summary,
  detailedExplanation,
  species,
  defaultSeverity: severityFor(id),
  configurable,
  category
});

const ruleViolation = (
  ruleId: string,
  category: RuleMetadata['category'],
  message: string,
  explanation: string,
  voiceIds: string[],
  startTick: number,
  noteIds?: string[],
  suggestedFixes?: SuggestedFix[]
): RuleViolation => ({
  ruleId,
  severity: severityFor(ruleId),
  message,
  explanation,
  voiceIds,
  startTick,
  noteIds,
  suggestedFixes,
  category
});

function uniqueTicks(score: CounterpointScore): number[] {
  return [...new Set(score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick)))].sort((a, b) => a - b);
}

function notesStartingAt(score: CounterpointScore, tick: number): NoteAtTick[] {
  return score.voices
    .flatMap((voice) => voice.notes.filter((note) => note.startTick === tick).map((note) => ({ voice, note })))
    .sort((a, b) => voiceRank(score, a.voice) - voiceRank(score, b.voice));
}

function noteActiveAt(voice: Voice, tick: number): NoteEvent | undefined {
  return voice.notes.find((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
}

function scoreEndTick(score: CounterpointScore): number {
  return Math.max(...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)), 0);
}

function notePairsAtTick(score: CounterpointScore, tick: number): Array<[Voice, NoteEvent, Voice, NoteEvent]> {
  const active = score.voices.map((voice) => ({ voice, note: noteActiveAt(voice, tick) })).filter((x): x is { voice: Voice; note: NoteEvent } => Boolean(x.note));
  const pairs: Array<[Voice, NoteEvent, Voice, NoteEvent]> = [];
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      pairs.push([active[i].voice, active[i].note, active[j].voice, active[j].note]);
    }
  }
  return pairs;
}

function isOuterPair(score: CounterpointScore, a: Voice, b: Voice): boolean {
  const top = [...score.voices].sort((x, y) => averageMidi(y) - averageMidi(x))[0];
  const bottom = [...score.voices].sort((x, y) => averageMidi(x) - averageMidi(y))[0];
  return (a.id === top.id && b.id === bottom.id) || (a.id === bottom.id && b.id === top.id);
}

function averageMidi(voice: Voice): number {
  return voice.notes.length ? voice.notes.reduce((sum, note) => sum + note.midi, 0) / voice.notes.length : 0;
}

function voiceRank(score: CounterpointScore, voice: Voice): number {
  if (voice.position === 'above') return 0;
  if (voice.position === 'below') return 999;
  const rankByAverage = [...score.voices].sort((a, b) => averageMidi(b) - averageMidi(a)).findIndex((candidate) => candidate.id === voice.id);
  return rankByAverage >= 0 ? rankByAverage : 500;
}

function createParallelFixes(score: CounterpointScore, a: Voice, b: Voice, noteA: NoteEvent, noteB: NoteEvent): SuggestedFix[] {
  const fixes: SuggestedFix[] = [];
  const options = [-2, -1, 1, 2, 3, -3].map((delta) => ({
    noteA: noteA.midi + delta,
    noteB: noteB.midi
  }));
  for (const option of options) {
    fixes.push({
      description: `Move ${a.name} to ${midiToNoteName(option.noteA)} to break the perfect interval.`,
      noteChanges: [{ noteId: noteA.id, oldMidi: noteA.midi, newMidi: option.noteA }],
      estimatedScoreDelta: 8
    });
  }
  return fixes.slice(0, 3);
}

function melodicViolations(score: CounterpointScore): RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const voice of score.voices) {
    const notes = voice.notes;
    if (!notes.length) continue;
    let maxMidi = -Infinity;
    let climaxIndex = 0;
    for (let i = 0; i < notes.length; i += 1) {
      const note = notes[i];
      if (note.midi < voice.rangeMinMidi || note.midi > voice.rangeMaxMidi) {
        out.push(ruleViolation(
          'MEL_RANGE',
          'range',
          `${voice.name} exceeds the configured range.`,
          `${midiToNoteName(note.midi)} lies outside ${midiToNoteName(voice.rangeMinMidi)}-${midiToNoteName(voice.rangeMaxMidi)}.`,
          [voice.id],
          note.startTick,
          [note.id]
        ));
      }
      if (note.midi > maxMidi) {
        maxMidi = note.midi;
        climaxIndex = i;
      }
      if (i > 0) {
        const prev = notes[i - 1];
        const diff = note.midi - prev.midi;
        const abs = Math.abs(diff);
        if (diff === 0) {
          out.push(ruleViolation('MEL_REPEATED_NOTES', 'melody', `${voice.name} repeats a pitch.`, 'Repeated notes can reduce melodic direction in strict species counterpoint.', [voice.id], note.startTick, [prev.id, note.id]));
        }
        if (abs === 6) {
          out.push(ruleViolation('MEL_TRITONE', 'melody', `${voice.name} outlines a melodic tritone.`, 'Augmented fourths and diminished fifths are treated conservatively in this system.', [voice.id], note.startTick, [prev.id, note.id]));
        }
        if (abs === 1 || abs === 6 || abs === 10 || abs >= 12) {
          if (abs >= 12) {
            out.push(ruleViolation('MEL_AUGMENTED_LEAP', 'melody', `${voice.name} leaps by an octave or more.`, 'Large leaps should be rare and compensated carefully.', [voice.id], note.startTick, [prev.id, note.id]));
          }
        }
        if (abs > 9) {
          out.push(ruleViolation('MEL_AUGMENTED_LEAP', 'melody', `${voice.name} makes an unusually large leap.`, 'Large leaps weaken singability unless handled intentionally.', [voice.id], note.startTick, [prev.id, note.id]));
        }
        if (i > 1) {
          const before = notes[i - 2];
          const firstLeap = notes[i - 1].midi - before.midi;
          const secondLeap = note.midi - prev.midi;
          if (Math.abs(firstLeap) > 4 && Math.abs(secondLeap) > 4 && Math.sign(firstLeap) === Math.sign(secondLeap)) {
            out.push(ruleViolation('MEL_LEAP_RECOVERY', 'melody', `${voice.name} makes consecutive leaps in the same direction.`, 'Strict species counterpoint prefers leap recovery by step in the opposite direction.', [voice.id], note.startTick, [before.id, prev.id, note.id]));
          }
        }
      }
    }
    const climaxAllowedWindow = [Math.floor(notes.length * 0.2), Math.ceil(notes.length * 0.8)];
    if (climaxIndex < climaxAllowedWindow[0] || climaxIndex > climaxAllowedWindow[1]) {
      out.push(ruleViolation('MEL_CLIMAX', 'melody', `${voice.name} places its climax awkwardly.`, 'A climax should generally emerge in the central span of the line.', [voice.id], notes[climaxIndex].startTick, [notes[climaxIndex].id]));
    }
  }
  return out;
}

function verticalViolations(score: CounterpointScore): RuleViolation[] {
  const out: RuleViolation[] = [];
  const ticks = uniqueTicks(score);
  for (const tick of ticks) {
    const pairs = notePairsAtTick(score, tick);
    for (const [a, noteA, b, noteB] of pairs) {
      const interval = intervalInfo(noteA.midi, noteB.midi, true);
      if (interval.consonance === 'dissonant') {
        const speciesRelevant = [a.species, b.species].some((species) => species && species !== 'fifth');
        if (speciesRelevant && tick % score.ticksPerWhole === 0) {
          out.push(ruleViolation('SP1_DISSONANCE', 'species', `Dissonant structural sonority between ${a.name} and ${b.name}.`, 'First-species vertical positions should be consonant on structural beats.', [a.id, b.id], tick, [noteA.id, noteB.id]));
        }
      }
      const nextTick = ticks.find((value) => value > tick);
      if (nextTick === undefined) continue;
      const aNext = noteActiveAt(a, nextTick);
      const bNext = noteActiveAt(b, nextTick);
      if (!aNext || !bNext) continue;
      const motion = classifyMotion(noteA.midi, aNext.midi, noteB.midi, bNext.midi);
      const nextInterval = intervalInfo(aNext.midi, bNext.midi, true);
      if (motion.type === 'parallel' && nextInterval.intervalClass === 7) {
        out.push(ruleViolation('HAR_PARALLEL_5', 'harmony', `Parallel fifths between ${a.name} and ${b.name}.`, 'Parallel perfect fifths weaken contrapuntal independence.', [a.id, b.id], tick, [noteA.id, noteB.id, aNext.id, bNext.id], createParallelFixes(score, a, b, aNext, bNext)));
      }
      if (motion.type === 'parallel' && nextInterval.intervalClass === 0) {
        out.push(ruleViolation('HAR_PARALLEL_8', 'harmony', `Parallel octaves/unisons between ${a.name} and ${b.name}.`, 'Parallel perfect consonances reduce independence.', [a.id, b.id], tick, [noteA.id, noteB.id, aNext.id, bNext.id]));
      }
      if (motion.type === 'similar' && isPerfectIntervalSemitoneClass(nextInterval.semitones) && isOuterPair(score, a, b) && Math.abs(aNext.midi - noteA.midi) > 1) {
        out.push(ruleViolation('HAR_DIRECT_8', 'harmony', `Direct perfect consonance in outer voices between ${a.name} and ${b.name}.`, 'Similar motion into a perfect interval is treated conservatively when the upper voice leaps.', [a.id, b.id], tick, [aNext.id, bNext.id]));
      }
      if (motion.type === 'similar' && nextInterval.intervalClass === 7 && isOuterPair(score, a, b) && Math.abs(aNext.midi - noteA.midi) > 1) {
        out.push(ruleViolation('HAR_DIRECT_5', 'harmony', `Direct perfect fifth in outer voices between ${a.name} and ${b.name}.`, 'Hidden fifths can obscure independence in the outer voices.', [a.id, b.id], tick, [aNext.id, bNext.id]));
      }
      if (nextInterval.intervalClass === 0 && motion.type === 'parallel') {
        out.push(ruleViolation('HAR_PARALLEL_1', 'harmony', `Parallel unisons between ${a.name} and ${b.name}.`, 'Parallel unisons collapse the counterpoint into a single line.', [a.id, b.id], tick, [noteA.id, noteB.id, aNext.id, bNext.id]));
      }
      if (isHiddenPerfect(noteA.midi, aNext.midi, noteB.midi, bNext.midi)) {
        out.push(ruleViolation('HAR_DIRECT_5', 'harmony', `Hidden perfect consonance between ${a.name} and ${b.name}.`, 'Direct motion into a perfect interval is controlled strictly in this system.', [a.id, b.id], tick, [aNext.id, bNext.id]));
      }
      const aRank = voiceRank(score, a);
      const bRank = voiceRank(score, b);
      const distance = Math.abs(noteA.midi - noteB.midi);
      if (distance > 19) {
        out.push(ruleViolation('TEX_DUPLICATED_LINE', 'texture', `Large spacing between ${a.name} and ${b.name}.`, 'Extremely wide spacing can weaken ensemble cohesion.', [a.id, b.id], tick, [noteA.id, noteB.id]));
      }
      if (aRank < bRank && noteA.midi < noteB.midi) {
        out.push(ruleViolation('HAR_VOICE_CROSSING', 'harmony', `${a.name} and ${b.name} cross.`, 'Voice crossing obscures line identity.', [a.id, b.id], tick, [noteA.id, noteB.id]));
      } else if (aRank > bRank && noteA.midi > noteB.midi) {
        out.push(ruleViolation('HAR_VOICE_CROSSING', 'harmony', `${a.name} and ${b.name} cross.`, 'Voice crossing obscures line identity.', [a.id, b.id], tick, [noteA.id, noteB.id]));
      }
      if (Math.abs(noteA.midi - noteB.midi) < 3) {
        out.push(ruleViolation('HAR_VOICE_OVERLAP', 'harmony', `${a.name} and ${b.name} overlap closely.`, 'Voice overlap can blur individual strands.', [a.id, b.id], tick, [noteA.id, noteB.id]));
      }
    }
  }
  return out;
}

function pairwiseMotionViolations(score: CounterpointScore): RuleViolation[] {
  const out: RuleViolation[] = [];
  const ticks = uniqueTicks(score);
  const motionCounts: Record<'parallel' | 'contrary' | 'similar' | 'oblique' | 'static', number> = { parallel: 0, contrary: 0, similar: 0, oblique: 0, static: 0 };
  for (let i = 0; i < ticks.length - 1; i += 1) {
    const tick = ticks[i];
    const nextTick = ticks[i + 1];
    for (let aIndex = 0; aIndex < score.voices.length; aIndex += 1) {
      for (let bIndex = aIndex + 1; bIndex < score.voices.length; bIndex += 1) {
        const a = score.voices[aIndex];
        const b = score.voices[bIndex];
        const aNow = noteActiveAt(a, tick);
        const bNow = noteActiveAt(b, tick);
        const aNext = noteActiveAt(a, nextTick);
        const bNext = noteActiveAt(b, nextTick);
        if (!aNow || !bNow || !aNext || !bNext) continue;
        const motion = classifyMotion(aNow.midi, aNext.midi, bNow.midi, bNext.midi);
        motionCounts[motion.type] += 1;
        if (motion.type === 'parallel' && isPerfectIntervalSemitoneClass(bNext.midi - aNext.midi)) {
          out.push(ruleViolation('TEX_EXCESSIVE_PARALLEL_MOTION', 'texture', `Parallel motion reinforced by perfect sonority between ${a.name} and ${b.name}.`, 'Excessive parallel motion reduces independence.', [a.id, b.id], tick, [aNow.id, bNow.id, aNext.id, bNext.id]));
        }
      }
    }
  }
  if (score.voices.length > 2 && motionCounts.parallel > motionCounts.contrary + motionCounts.oblique) {
    out.push(ruleViolation('TEX_EXCESSIVE_PARALLEL_MOTION', 'texture', 'The texture relies heavily on parallel motion.', 'A strong species exercise normally retains more contrary and oblique motion.', score.voices.map((v) => v.id), 0));
  }
  return out;
}

function speciesViolations(score: CounterpointScore): RuleViolation[] {
  const out: RuleViolation[] = [];
  const ticks = uniqueTicks(score);
  const cf = score.voices.find((voice) => voice.role === 'cantus');
  for (const voice of score.voices) {
    if (!voice.species || voice.role === 'cantus') continue;
    for (const note of voice.notes) {
      const isStrongBeat = note.startTick % score.ticksPerWhole === 0;
      const active = score.voices.filter((other) => other.id !== voice.id).map((other) => noteActiveAt(other, note.startTick)).filter((n): n is NoteEvent => Boolean(n));
      const consonant = active.every((otherNote) => classifyIntervalSemitones(otherNote.midi - note.midi, true) !== 'dissonant');
      if (voice.species === 'first' && !consonant) {
        out.push(ruleViolation('SP1_DISSONANCE', 'species', `First-species dissonance in ${voice.name}.`, 'First species requires consonance on every structural event.', [voice.id], note.startTick, [note.id]));
      }
      if (voice.species === 'second') {
        if (isStrongBeat && !consonant) {
          out.push(ruleViolation('SP2_ACCENTED_DISSONANCE', 'species', `Accented dissonance in ${voice.name}.`, 'Second species normally requires consonance on the strong beat.', [voice.id], note.startTick, [note.id]));
        }
        if (!isStrongBeat && !consonant) {
          const prev = voice.notes.find((n) => n.startTick + n.durationTicks === note.startTick);
          const next = voice.notes.find((n) => n.startTick === note.startTick + note.durationTicks);
          if (!prev || !next || Math.abs(prev.midi - note.midi) > 2 || Math.abs(next.midi - note.midi) > 2) {
            out.push(ruleViolation('SP2_BAD_PASSING', 'species', `Unsupported weak-beat dissonance in ${voice.name}.`, 'Weak-beat dissonance should normally function as a passing tone approached and left by step.', [voice.id], note.startTick, [note.id]));
          }
        }
      }
      if (voice.species === 'third' && !consonant && isStrongBeat) {
        out.push(ruleViolation('SP3_BAD_DISSONANCE', 'species', `Unsupported accented dissonance in ${voice.name}.`, 'Third species allows controlled internal dissonance, but beat 1 should normally be consonant.', [voice.id], note.startTick, [note.id]));
      }
      if (voice.species === 'fourth') {
        if (note.tiedFromPrevious && !consonant && !cf) {
          out.push(ruleViolation('SP4_UNPREPARED_SUSPENSION', 'species', `Suspension preparation is unclear in ${voice.name}.`, 'Fourth species requires consonant preparation before the tied dissonance.', [voice.id], note.startTick, [note.id]));
        }
        if (note.tiedFromPrevious && !consonant) {
          const next = voice.notes.find((n) => n.startTick === note.startTick + note.durationTicks);
          if (!next || next.midi > note.midi) {
            out.push(ruleViolation('SP4_BAD_RESOLUTION', 'species', `Suspension in ${voice.name} does not resolve downward by step.`, 'Controlled suspensions normally resolve downward by step unless configured otherwise.', [voice.id], note.startTick, [note.id]));
          }
        }
        if (note.tiedFromPrevious && consonant) {
          out.push(ruleViolation('SP4_UNRESOLVED_SUSPENSION', 'species', `Suspension in ${voice.name} may be too weakly controlled.`, 'A tied note that behaves consonantly may be treated as consonant syncopation rather than a true suspension.', [voice.id], note.startTick, [note.id]));
        }
      }
      if (voice.species === 'fifth' && !consonant && isStrongBeat) {
        out.push(ruleViolation('SP5_BAD_DISSONANCE', 'species', `Uncontrolled dissonance in ${voice.name}.`, 'Fifth species requires rhythmically and melodically justified dissonance.', [voice.id], note.startTick, [note.id]));
      }
    }
  }
  return out;
}

function cadenceViolations(score: CounterpointScore): RuleViolation[] {
  const cadence = analyzeCadence(score);
  if (cadence.quality === 'invalid') {
    return [
      ruleViolation('CAD_FINAL', 'cadence', 'Final sonority is unstable.', cadence.explanation, score.voices.map((voice) => voice.id), cadence.endTick)
    ];
  }
  return [];
}

function textureViolations(score: CounterpointScore): RuleViolation[] {
  const out: RuleViolation[] = [];
  const voicePairs = score.voices.flatMap((a, index) => score.voices.slice(index + 1).map((b) => [a, b] as const));
  for (const [a, b] of voicePairs) {
    const aMidi = a.notes.map((n) => n.midi).join(',');
    const bMidi = b.notes.map((n) => n.midi).join(',');
    if (aMidi === bMidi || aMidi === b.notes.map((n) => n.midi + 12).join(',')) {
      out.push(ruleViolation('TEX_DUPLICATED_LINE', 'texture', `${a.name} and ${b.name} duplicate the same contour.`, 'Duplicated lines reduce independence and can create octave shadowing.', [a.id, b.id], 0, [...a.notes.map((n) => n.id), ...b.notes.map((n) => n.id)]));
    }
  }
  return out;
}

export const RULES: CounterpointRule[] = [
  {
    id: 'MEL_RANGE',
    name: 'Melodic Range',
    category: 'range',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_RANGE'),
    metadata: meta('MEL_RANGE', 'Melodic Range', 'A line should remain within its assigned range.', 'Notes outside the configured range are treated as direct violations because they are singability problems rather than merely stylistic issues.', 'all', true, 'range')
  },
  {
    id: 'MEL_REPEATED_NOTES',
    name: 'Repeated Notes',
    category: 'melody',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_REPEATED_NOTES'),
    metadata: meta('MEL_REPEATED_NOTES', 'Repeated Notes', 'Repeated notes are discouraged by default.', 'Repeated pitch can flatten melodic direction unless a specific species pattern justifies it.', 'all', true, 'melody')
  },
  {
    id: 'MEL_AUGMENTED_LEAP',
    name: 'Large Leap',
    category: 'melody',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_AUGMENTED_LEAP'),
    metadata: meta('MEL_AUGMENTED_LEAP', 'Large Leap', 'Large leaps are rare and should be compensated.', 'Species counterpoint prefers predominantly conjunct motion; wide leaps need special justification and recovery.', 'all', true, 'melody')
  },
  {
    id: 'MEL_TRITONE',
    name: 'Melodic Tritone',
    category: 'melody',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_TRITONE'),
    metadata: meta('MEL_TRITONE', 'Melodic Tritone', 'Melodic tritones are treated conservatively.', 'The tritone is an especially unstable melodic span in strict species pedagogy.', 'all', true, 'melody')
  },
  {
    id: 'MEL_LEAP_RECOVERY',
    name: 'Leap Recovery',
    category: 'melody',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_LEAP_RECOVERY'),
    metadata: meta('MEL_LEAP_RECOVERY', 'Leap Recovery', 'Consecutive leaps in the same direction are discouraged.', 'Strict style usually prefers a compensating stepwise move after a large leap.', 'all', true, 'melody')
  },
  {
    id: 'MEL_CLIMAX',
    name: 'Climax Placement',
    category: 'melody',
    applies: () => true,
    evaluate: (context) => melodicViolations(context.score).filter((v) => v.ruleId === 'MEL_CLIMAX'),
    metadata: meta('MEL_CLIMAX', 'Climax Placement', 'A line should generally have one clear climax in a sensible position.', 'The highest pitch should usually emerge as part of an arch-like contour rather than appearing at the opening or after a long stagnant span.', 'all', true, 'melody')
  },
  {
    id: 'HAR_PARALLEL_5',
    name: 'Parallel Fifths',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_PARALLEL_5'),
    metadata: meta('HAR_PARALLEL_5', 'Parallel Fifths', 'Parallel perfect fifths are prohibited in strict species counterpoint.', 'Repeated perfect fifths reduce independence and are one of the central forbidden sonorities in Fux-inspired pedagogy.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_PARALLEL_8',
    name: 'Parallel Octaves',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_PARALLEL_8'),
    metadata: meta('HAR_PARALLEL_8', 'Parallel Octaves', 'Parallel octaves and unisons are prohibited.', 'Octave doubling across motion tends to collapse distinct voices into a single strand.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_PARALLEL_1',
    name: 'Parallel Unisons',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_PARALLEL_1'),
    metadata: meta('HAR_PARALLEL_1', 'Parallel Unisons', 'Parallel unisons are prohibited.', 'Unisons are even more reductive than octaves and are treated especially cautiously.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_DIRECT_5',
    name: 'Direct Fifths',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_DIRECT_5'),
    metadata: meta('HAR_DIRECT_5', 'Direct Fifths', 'Direct perfect fifths are controlled strictly in the outer voices.', 'Similar motion into a perfect fifth can weaken the independence of the upper and lower voices.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_DIRECT_8',
    name: 'Direct Octaves',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_DIRECT_8'),
    metadata: meta('HAR_DIRECT_8', 'Direct Octaves', 'Direct perfect octaves are controlled strictly in the outer voices.', 'Similar motion into an octave is treated as a strong structural independence issue.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_VOICE_CROSSING',
    name: 'Voice Crossing',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_VOICE_CROSSING'),
    metadata: meta('HAR_VOICE_CROSSING', 'Voice Crossing', 'Voice crossing is prohibited by default.', 'Crossing disrupts stable voice order and obscures registral identity.', 'all', true, 'harmony')
  },
  {
    id: 'HAR_VOICE_OVERLAP',
    name: 'Voice Overlap',
    category: 'harmony',
    applies: () => true,
    evaluate: (context) => verticalViolations(context.score).filter((v) => v.ruleId === 'HAR_VOICE_OVERLAP'),
    metadata: meta('HAR_VOICE_OVERLAP', 'Voice Overlap', 'Voice overlap is controlled conservatively.', 'Adjacent voices should remain clearly ordered unless a specific exception is enabled.', 'all', true, 'harmony')
  },
  {
    id: 'SP1_DISSONANCE',
    name: 'First Species Dissonance',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP1_DISSONANCE'),
    metadata: meta('SP1_DISSONANCE', 'First Species Dissonance', 'First species requires consonance on each structural sonority.', 'In first species, every note forms a directly vertical contrapuntal event; dissonance is therefore not permitted in the default pedagogical system.', [ 'first' ], true, 'species')
  },
  {
    id: 'SP2_ACCENTED_DISSONANCE',
    name: 'Second Species Accented Dissonance',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP2_ACCENTED_DISSONANCE'),
    metadata: meta('SP2_ACCENTED_DISSONANCE', 'Second Species Accented Dissonance', 'Strong-beat dissonance is normally prohibited in second species.', 'Accented dissonance is only accepted under special configuration because the strong beat is structurally prominent.', [ 'second' ], true, 'species')
  },
  {
    id: 'SP2_BAD_PASSING',
    name: 'Second Species Bad Passing',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP2_BAD_PASSING'),
    metadata: meta('SP2_BAD_PASSING', 'Second Species Passing Dissonance', 'Weak-beat dissonance must function as a passing tone.', 'Second species only permits weak-beat dissonance when it is approached and left by step in a clear directional gesture.', [ 'second' ], true, 'species')
  },
  {
    id: 'SP3_BAD_DISSONANCE',
    name: 'Third Species Dissonance',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP3_BAD_DISSONANCE'),
    metadata: meta('SP3_BAD_DISSONANCE', 'Third Species Dissonance', 'Strongly accented third-species dissonance is not allowed by default.', 'Internal dissonance in third species must be created by recognized melodic patterns.', [ 'third' ], true, 'species')
  },
  {
    id: 'SP4_UNPREPARED_SUSPENSION',
    name: 'Fourth Species Unprepared Suspension',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP4_UNPREPARED_SUSPENSION'),
    metadata: meta('SP4_UNPREPARED_SUSPENSION', 'Fourth Species Unprepared Suspension', 'Suspensions require consonant preparation.', 'The suspended note must be prepared by a consonance before it creates a tied dissonance.', [ 'fourth' ], true, 'species')
  },
  {
    id: 'SP4_UNRESOLVED_SUSPENSION',
    name: 'Fourth Species Unresolved Suspension',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP4_UNRESOLVED_SUSPENSION'),
    metadata: meta('SP4_UNRESOLVED_SUSPENSION', 'Fourth Species Unresolved Suspension', 'A tied note may need clearer resolution labeling.', 'When a tied note remains consonant the passage may be interpreted as syncopation instead of a true suspension.', [ 'fourth' ], true, 'species')
  },
  {
    id: 'SP4_BAD_RESOLUTION',
    name: 'Fourth Species Bad Resolution',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP4_BAD_RESOLUTION'),
    metadata: meta('SP4_BAD_RESOLUTION', 'Fourth Species Resolution', 'Suspensions normally resolve downward by step.', 'The classical suspension gesture resolves the dissonance with a controlled downward step unless configuration explicitly relaxes it.', [ 'fourth' ], true, 'species')
  },
  {
    id: 'SP5_BAD_DISSONANCE',
    name: 'Fifth Species Dissonance',
    category: 'species',
    applies: () => true,
    evaluate: (context) => speciesViolations(context.score).filter((v) => v.ruleId === 'SP5_BAD_DISSONANCE'),
    metadata: meta('SP5_BAD_DISSONANCE', 'Fifth Species Dissonance', 'Florid species requires controlled dissonance.', 'In fifth species, mixed rhythm must still preserve clear dissonance treatment and rhythmic coherence.', [ 'fifth' ], true, 'species')
  },
  {
    id: 'CAD_FINAL',
    name: 'Cadence Final',
    category: 'cadence',
    applies: () => true,
    evaluate: (context) => cadenceViolations(context.score),
    metadata: meta('CAD_FINAL', 'Cadence', 'The ending should settle on a consonant final sonority.', 'Cadence evaluation looks at the final sonority and the approach to it rather than only the final pitch set.', 'all', true, 'cadence')
  },
  {
    id: 'TEX_DUPLICATED_LINE',
    name: 'Duplicated Line',
    category: 'texture',
    applies: () => true,
    evaluate: (context) => textureViolations(context.score),
    metadata: meta('TEX_DUPLICATED_LINE', 'Duplicated Line', 'Lines should not simply shadow one another.', 'Overly similar contours or exact duplication weaken multi-voice independence.', 'all', true, 'texture')
  },
  {
    id: 'TEX_EXCESSIVE_PARALLEL_MOTION',
    name: 'Excessive Parallel Motion',
    category: 'texture',
    applies: () => true,
    evaluate: (context) => pairwiseMotionViolations(context.score),
    metadata: meta('TEX_EXCESSIVE_PARALLEL_MOTION', 'Excessive Parallel Motion', 'The texture should not lean too heavily on parallel motion.', 'A healthy species texture generally balances parallel motion with contrary and oblique movement.', 'all', true, 'texture')
  }
];

export function evaluateScore(score: CounterpointScore): { violations: RuleViolation[]; cadence: ReturnType<typeof analyzeCadence> } {
  const violations = RULES.flatMap((rule) => rule.evaluate({ score }));
  return { violations, cadence: analyzeCadence(score) };
}

export function getRuleMetadata(): RuleMetadata[] {
  return RULES.map((rule) => rule.metadata);
}

export function beatLabel(tick: number, ticksPerWhole: number): string {
  return beatLabelFromTick(tick, ticksPerWhole);
}
