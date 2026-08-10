import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { Button, Card, CardBody, CardHeader, Textarea } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { parseScoreText } from '../counterpoint/parser';
import { studyExamples } from '../examples/builtInExamples';
import { evaluateCounterpoint } from '../counterpoint/evaluator';

export function EvaluatePage() {
  const { score, updateScore, evaluate, updateNote, setScore, loadExample } = useAppStore();
  const [text, setText] = useState('CF: D4 E4 F4 G4 A4 G4 F4 E4 D4\nCP1: A4 C5 A4 C5 B4 A4 C5 D5 D5');
  const result = evaluateCounterpoint(score);

  function importText() {
    const parsed = parseScoreText(text, score);
    setScore(parsed.score);
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
          <CardHeader><div className="text-sm font-semibold">Text Entry</div></CardHeader>
          <CardBody className="space-y-3">
            <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="font-mono text-sm" />
            <div className="flex gap-2">
              <Button onClick={importText}>Parse and Evaluate</Button>
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

        <Card>
          <CardHeader><div className="text-sm font-semibold">Study Examples</div></CardHeader>
          <CardBody className="space-y-2">
            <div className="text-sm text-slate-600">These examples are intentionally flawed and are not loaded by default.</div>
            <div className="flex flex-wrap gap-2">
              {studyExamples.map((example) => (
                <Button key={example.id} variant="secondary" onClick={() => loadExample(example)}>{example.title}</Button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
