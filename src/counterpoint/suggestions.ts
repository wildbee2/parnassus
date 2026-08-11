import type { CounterpointScore, NoteEvent, RuleViolation, SuggestedFix } from './model';
import { evaluateCounterpoint } from './evaluator';
import { speciesDurationAtIndex, voiceEndTick } from './species';
import { modeDegreeToPc } from '../music/mode';
import { midiToPitchClass, midiToNoteName } from '../music/pitch';

export function suggestRepairsForViolation(score: CounterpointScore, violation: RuleViolation): SuggestedFix[] {
  if (violation.suggestedFixes?.length) return violation.suggestedFixes;
  const fixes: SuggestedFix[] = [];
  const firstVoice = score.voices.find((voice) => violation.voiceIds.includes(voice.id));
  const noteId = violation.noteIds?.[0];
  const note = firstVoice?.notes.find((candidate) => candidate.id === noteId) ?? firstVoice?.notes[0];
  if (!firstVoice || !note) return fixes;
  for (const delta of [-2, -1, 1, 2, 3, -3]) {
    const newMidi = note.midi + delta;
    if (newMidi < firstVoice.rangeMinMidi || newMidi > firstVoice.rangeMaxMidi) continue;
    fixes.push({
      description: `Move ${firstVoice.name} to ${midiToNoteName(newMidi)}.`,
      noteChanges: [{ noteId: note.id, oldMidi: note.midi, newMidi }],
      estimatedScoreDelta: 4
    });
  }
  return fixes.slice(0, 3);
}

function modalPitchCandidatesInRange(min: number, max: number, mode: CounterpointScore['mode'], tonicPitchClass: number): number[] {
  const modalPitchClasses = new Set<number>();
  for (let degree = 1; degree <= 7; degree += 1) {
    modalPitchClasses.add(modeDegreeToPc(mode, tonicPitchClass, degree));
  }

  const out: number[] = [];
  for (let midi = min; midi <= max; midi += 1) {
    if (modalPitchClasses.has(midiToPitchClass(midi))) {
      out.push(midi);
    }
  }
  return out;
}

function violationSignature(violation: RuleViolation): string {
  return [
    violation.ruleId,
    violation.category,
    violation.startTick,
    violation.endTick ?? '',
    violation.voiceIds.join(','),
    violation.noteIds?.join(',') ?? ''
  ].join('|');
}

function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }
  return out;
}

export function suggestNoteAddition(score: CounterpointScore, random = Math.random): CounterpointScore | null {
  const counterpointVoices = score.voices.filter((voice) => voice.role === 'counterpoint');
  if (!counterpointVoices.length) return null;

  const endTicks = counterpointVoices.map((voice) => voiceEndTick(voice));
  const shortest = Math.min(...endTicks);
  const longest = Math.max(...endTicks);
  const candidateVoices = shortest < longest
    ? counterpointVoices.filter((voice, index) => endTicks[index] === shortest)
    : counterpointVoices;
  const targetVoice = candidateVoices[Math.floor(random() * candidateVoices.length)] ?? candidateVoices[0];
  if (!targetVoice) return null;

  const insertTick = voiceEndTick(targetVoice);
  const durationTicks = speciesDurationAtIndex(targetVoice.species, targetVoice.notes.length, score.ticksPerWhole);
  const candidatePitches = shuffle(modalPitchCandidatesInRange(targetVoice.rangeMinMidi, targetVoice.rangeMaxMidi, score.mode, score.tonicPitchClass), random);
  const baselineSignatures = new Set(evaluateCounterpoint(score).violations.map(violationSignature));

  for (const midi of candidatePitches) {
    const nextScore = structuredClone(score);
    const nextVoice = nextScore.voices.find((voice) => voice.id === targetVoice.id);
    if (!nextVoice) continue;
    const noteId = `${nextVoice.id}-${nextVoice.notes.length}`;
    const note: NoteEvent = {
      id: noteId,
      midi,
      startTick: insertTick,
      durationTicks
    };
    nextVoice.notes = [...nextVoice.notes, note];

    const newEvaluation = evaluateCounterpoint(nextScore);
    const newViolations = newEvaluation.violations.filter((violation) => !baselineSignatures.has(violationSignature(violation)));
    if (!newViolations.length) {
      return nextScore;
    }
  }

  return null;
}
