import { useMemo } from 'react';
import { midiToNoteName } from '../../music/pitch';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Textarea } from '../ui';
import { suggestRepairsForViolation } from '../../counterpoint/suggestions';
import type { CounterpointScore } from '../../counterpoint/model';
import { exportScoreJson } from '../../importExport/json';

export function InspectorPanel({ score, onApplyFix }: { score: CounterpointScore; onApplyFix: (noteId: string, newMidi: number) => void }) {
  const { selectedNoteId, selectedVoiceId, evaluation, updateSettings, settings } = useAppStore();
  const selectedVoice = score.voices.find((voice) => voice.id === selectedVoiceId);
  const selectedNote = selectedVoice?.notes.find((note) => note.id === selectedNoteId);
  const fixes = useMemo(() => evaluation?.violations.flatMap((violation) => suggestRepairsForViolation(score, violation)) ?? [], [evaluation, score]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Inspector</div>
        </CardHeader>
        <CardBody className="space-y-3">
          {selectedVoice ? <div className="text-sm">Voice: <strong>{selectedVoice.name}</strong></div> : <div className="text-sm text-slate-500">Select a note to inspect it.</div>}
          {selectedNote ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div>Pitch: {midiToNoteName(selectedNote.midi)}</div>
                <div>Start tick: {selectedNote.startTick}</div>
                <div>Duration: {selectedNote.durationTicks}</div>
              </div>
              <div className="space-y-2">
                <Label>Edit MIDI</Label>
                <Input
                  type="number"
                  value={selectedNote.midi}
                  onChange={(event) => onApplyFix(selectedNote.id, Number(event.target.value))}
                />
              </div>
            </>
          ) : null}
        </CardBody>
      </Card>

      {evaluation ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Evaluation</div>
              <Badge tone={evaluation.score >= 90 ? 'success' : evaluation.score >= 70 ? 'warning' : 'danger'}>{evaluation.score}</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="text-xs text-slate-600">The numeric score is a pedagogical summary, not a historical or aesthetic verdict.</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Species {evaluation.categoryScores.speciesCompliance}</div>
              <div>Melody {evaluation.categoryScores.melodicQuality}</div>
              <div>Dissonance {evaluation.categoryScores.consonanceHandling}</div>
              <div>Independence {evaluation.categoryScores.voiceIndependence}</div>
            </div>
            <div className="space-y-2">
              {evaluation.violations.slice(0, 8).map((violation) => (
                <div key={`${violation.ruleId}-${violation.startTick}`} className="rounded-lg border border-slate-200 p-2 text-xs">
                  <div className="font-medium">{violation.ruleId} · {violation.message}</div>
                  <div className="text-slate-600">{violation.explanation}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Settings Snapshot</div>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="space-y-2">
            <Label>Strictness Profile</Label>
            <select
              value={settings.strictnessProfile}
              onChange={(event) => updateSettings({ strictnessProfile: event.target.value as typeof settings.strictnessProfile })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="strict">Pedagogical Strict</option>
              <option value="balanced">Balanced</option>
              <option value="permissive">Historically Permissive</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Generation Heuristics</Label>
            <select
              value={settings.heuristicMode}
              onChange={(event) => updateSettings({ heuristicMode: event.target.value as typeof settings.heuristicMode })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="strict">Strict evaluation</option>
              <option value="humanLike">Human-like heuristics</option>
              <option value="harmonizing">Harmonizing heuristics</option>
            </select>
          </div>
          <div className="text-xs text-slate-500">Export JSON preview available from the toolbar.</div>
          <Textarea readOnly value={exportScoreJson(score)} rows={8} className="font-mono text-[11px]" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Suggested Fixes</div>
        </CardHeader>
        <CardBody className="space-y-2">
          {fixes.length ? fixes.slice(0, 3).map((fix) => (
            <div key={fix.description} className="rounded-lg border border-slate-200 p-2 text-xs">
              <div className="font-medium">{fix.description}</div>
              <div className="text-slate-500">Estimated delta {fix.estimatedScoreDelta}</div>
            </div>
          )) : <div className="text-xs text-slate-500">No local fixes found yet.</div>}
        </CardBody>
      </Card>
    </div>
  );
}
