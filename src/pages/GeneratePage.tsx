import { useMemo, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { evaluateCounterpoint } from '../counterpoint/evaluator';
import type { CounterpointScore } from '../counterpoint/model';
import { canonicalExamples } from '../examples/builtInExamples';

export function GeneratePage() {
  const { score, updateScore, evaluate, updateNote, setTempo, setTitle, loadExample, clearScore } = useAppStore();
  const [selectedExampleId, setSelectedExampleId] = useState('');

  const exampleSummary = useMemo(() => evaluateCounterpoint(score), [score]);

  return (
    <AppShell
      title="Example Playback"
      inspector={<InspectorPanel score={score} onApplyFix={(noteId, newMidi) => {
        const voice = score.voices.find((candidate) => candidate.notes.some((note) => note.id === noteId));
        if (voice) updateNote(voice.id, noteId, { midi: newMidi });
        evaluate();
      }} />}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Example Selection</div>
                <div className="text-xs text-slate-500">Choose a verified example to load into the editor and playback controls.</div>
              </div>
              <Badge tone="info">{score.mode}</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Example</Label>
              <Select
                value={selectedExampleId}
                onChange={(event) => {
                  const example = canonicalExamples.find((candidate) => candidate.id === event.target.value);
                  setSelectedExampleId(event.target.value);
                  if (example) {
                    loadExample(example);
                    evaluate();
                  }
                }}
              >
                <option value="">Load verified example</option>
                {canonicalExamples.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={score.mode}
                onChange={(event) => updateScore((current) => ({ ...current, mode: event.target.value as CounterpointScore['mode'] }))}
              >
                <option value="ionian">Ionian</option>
                <option value="dorian">Dorian</option>
                <option value="phrygian">Phrygian</option>
                <option value="lydian">Lydian</option>
                <option value="mixolydian">Mixolydian</option>
                <option value="aeolian">Aeolian</option>
                <option value="major">Major</option>
                <option value="natural_minor">Natural minor</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Final pitch class</Label>
              <Input
                type="number"
                min={0}
                max={11}
                value={score.tonicPitchClass}
                onChange={(event) => updateScore((current) => ({ ...current, tonicPitchClass: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={score.title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tempo</Label>
              <Input type="number" value={score.tempoBpm} onChange={(event) => setTempo(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Seed</Label>
              <Input
                type="number"
                value={score.seed ?? 17}
                onChange={(event) => updateScore((current) => ({ ...current, seed: Number(event.target.value) }))}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => {
            if (!selectedExampleId) return;
            const example = canonicalExamples.find((candidate) => candidate.id === selectedExampleId);
            if (example) {
              loadExample(example);
              evaluate();
            }
          }} disabled={!selectedExampleId}>Reload Example</Button>
          <Button variant="secondary" onClick={() => {
            clearScore();
            setSelectedExampleId('');
          }}>Blank Score</Button>
        </div>

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
          <CardHeader><div className="text-sm font-semibold">Example Summary</div></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm">Score: {exampleSummary.score}</div>
              <div className="text-xs text-slate-500">The numeric score is a pedagogical summary, not a historical or aesthetic verdict.</div>
            </div>
            <div>
              <div className="text-sm">Violations: {exampleSummary.violations.length}</div>
              <div className="text-xs text-slate-500">{exampleSummary.cadenceAnalysis.explanation}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
