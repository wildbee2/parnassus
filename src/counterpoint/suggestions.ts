import type { CounterpointScore, SuggestedFix, RuleViolation } from './model';
import { midiToNoteName } from '../music/pitch';

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

