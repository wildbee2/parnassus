import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { Badge, Button, Card, CardBody, CardHeader, Label, Select, Textarea } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { parseScoreText } from '../counterpoint/parser';
import { evaluateCounterpoint } from '../counterpoint/evaluator';
import { suggestNoteAddition } from '../counterpoint/suggestions';

export function EvaluatePage() {
  const { score, updateScore, updateVoice, evaluate, updateNote, setScore } = useAppStore();
  const [text, setText] = useState('CF: D4/2 E4/2 F4/2 G4/2\nCP1 (second): A4/4 C5/4 A4/4 C5/4 B4/4 A4/4 C5/4 D5/4');
  const result = evaluateCounterpoint(score);

  function importText() {
    const parsed = parseScoreText(text, score);
    setScore(parsed.score);
    evaluate();
  }

  function suggest() {
    const nextScore = suggestNoteAddition(score);
    if (!nextScore) return;
    setScore(nextScore);
    evaluate();
  }

  return (
    <AppShell
      title="Evaluate"
      inspector={<InspectorPanel score={score} onApplyFix={(noteId, newMidi) => {
        const voice = score.voices.find((candidate) => candidate.notes.some((note) => note.id === noteId));
        if (voice) updateNote(voice.id, noteId, { midi: newMidi });
        evaluate();
      }} />}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Text Entry</div>
                <div className="text-xs text-slate-500">Use `/2` for half notes, `/4` for quarter notes, and add a species name in the voice label if you want the parser to set it.</div>
              </div>
              <Badge tone="info">Parsed text</Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="font-mono text-sm" />
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
              Examples: <span className="font-mono">CF: D4/2 E4/2</span>, <span className="font-mono">CP1 (second): A4/4 C5/4</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={importText}>Parse and Evaluate</Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Line Species</div>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            {score.voices
              .filter((voice) => voice.role !== 'cantus')
              .map((voice) => (
                <div key={voice.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Label>{voice.name}</Label>
                  <Select
                    value={voice.species ?? 'first'}
                    onChange={(event) => {
                      updateVoice(voice.id, { species: event.target.value as typeof voice.species });
                      evaluate();
                    }}
                  >
                    <option value="first">First species</option>
                    <option value="second">Second species</option>
                    <option value="third">Third species</option>
                    <option value="fourth">Fourth species</option>
                    <option value="fifth">Fifth species</option>
                  </Select>
                </div>
              ))}
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={suggest}>Suggest</Button>
            </div>
          </CardBody>
        </Card>
        <ScoreGrid
          score={score}
          selectedNoteId={useAppStore.getState().selectedNoteId}
          onSelectNote={(voiceId, noteId) => {
            useAppStore.getState().setSelectedVoiceId(voiceId);
            useAppStore.getState().setSelectedNoteId(noteId);
          }}
          onUpdateNote={(voiceId, noteId, patch) => {
            updateNote(voiceId, noteId, patch);
            evaluate();
          }}
        />
        <PlaybackControls score={score} />
        <Card>
          <CardHeader><div className="text-sm font-semibold">Category Scores</div></CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            {Object.entries(result.categoryScores).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{key}</div>
                <div className="text-slate-600">{value}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
