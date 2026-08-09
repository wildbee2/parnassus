import { useMemo, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { useAppStore, defaultScore } from '../store/useAppStore';
import { exportScoreJson } from '../importExport/json';
import { generateCounterpointScore } from '../generator';
import { evaluateCounterpoint } from '../counterpoint/evaluator';
import type { Species } from '../counterpoint/model';
import { modeNameLabel } from '../music/mode';

const SPECIES: Species[] = ['first', 'second', 'third', 'fourth', 'fifth'];

export function GeneratePage() {
  const { score, setScore, updateScore, evaluate, updateNote, updateVoice, setTempo, setTitle } = useAppStore();
  const [voiceCount, setVoiceCount] = useState(score.voices.length);
  const [seed, setSeed] = useState(score.seed ?? 17);
  const [mode, setMode] = useState(score.mode);
  const [tonicPitchClass, setTonicPitchClass] = useState(score.tonicPitchClass);

  const generationSummary = useMemo(() => evaluateCounterpoint(score), [score]);

  function resizeVoices(count: number) {
    setVoiceCount(count);
    updateScore((current) => {
      const cf = current.voices.find((voice) => voice.role === 'cantus') ?? current.voices[0];
      const cpVoices = current.voices.filter((voice) => voice.role !== 'cantus');
      const nextVoices = [cf];
      for (let index = 0; index < count - 1; index += 1) {
        nextVoices.push(cpVoices[index] ?? {
          id: `cp${index + 1}`,
          name: `Counterpoint ${index + 1}`,
          role: 'counterpoint',
          species: SPECIES[index % SPECIES.length],
          rangeMinMidi: 48,
          rangeMaxMidi: 76,
          position: index === count - 2 ? 'below' : 'above',
          notes: []
        });
      }
      return { ...current, voices: nextVoices };
    });
  }

  function generate() {
    updateScore((current) => generateCounterpointScore({
      score: { ...current, mode, tonicPitchClass, seed },
      options: { beamWidth: 40, maxBacktracks: 80, seed, strictness: useAppStore.getState().settings.strictnessProfile }
    }).score);
    evaluate();
  }

  return (
    <AppShell
      title="Generate"
      onExportJson={() => navigator.clipboard.writeText(exportScoreJson(score))}
      onClear={() => useAppStore.getState().clearScore()}
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
                <div className="text-sm font-semibold">Generation Setup</div>
                <div className="text-xs text-slate-500">Fux-inspired strict species counterpoint</div>
              </div>
              <Badge tone="info">{modeNameLabel(score.mode)}</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Number of voices</Label>
              <Select value={voiceCount} onChange={(event) => resizeVoices(Number(event.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
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
              <Input type="number" min={0} max={11} value={tonicPitchClass} onChange={(event) => setTonicPitchClass(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Seed</Label>
              <Input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={score.title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tempo</Label>
              <Input type="number" value={score.tempoBpm} onChange={(event) => setTempo(Number(event.target.value))} />
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generate}>Generate</Button>
          <Button variant="secondary" onClick={() => resizeVoices(4)}>Generate 5 Alternatives</Button>
          <Button variant="secondary" onClick={() => evaluate()}>Evaluate</Button>
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
          <CardHeader><div className="text-sm font-semibold">Generation Summary</div></CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm">Score: {generationSummary.score}</div>
              <div className="text-xs text-slate-500">The numeric score is a pedagogical summary, not a historical or aesthetic verdict.</div>
            </div>
            <div>
              <div className="text-sm">Violations: {generationSummary.violations.length}</div>
              <div className="text-xs text-slate-500">{generationSummary.cadenceAnalysis.explanation}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

