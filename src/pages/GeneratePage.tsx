import { useMemo, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { InspectorPanel } from '../components/inspector/InspectorPanel';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { exportScoreJson } from '../importExport/json';
import { generateCounterpointScore } from '../generator';
import { evaluateCounterpoint } from '../counterpoint/evaluator';
import type { CounterpointScore, Species } from '../counterpoint/model';
import { canonicalExamples } from '../examples/builtInExamples';

const SPECIES: Species[] = ['first', 'second', 'third', 'fourth', 'fifth'];

export function GeneratePage() {
  const { score, setScore, updateScore, evaluate, updateNote, setTempo, setTitle, generate: generateScore } = useAppStore();
  const [alternatives, setAlternatives] = useState<CounterpointScore[]>([]);

  const generationSummary = useMemo(() => evaluateCounterpoint(score), [score]);

  function resizeVoices(count: number) {
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
    generateScore();
    setAlternatives([]);
  }

  function generateAlternatives() {
    const base = structuredClone(score);
    const seed = base.seed ?? 17;
    const strictness = useAppStore.getState().settings.strictnessProfile;
    const variants = Array.from({ length: 5 }, (_, index) =>
      generateCounterpointScore({
        score: structuredClone(base),
        options: {
          beamWidth: 40,
          maxBacktracks: 80,
          seed: seed + index * 7919,
          strictness
        }
      }).score
    );
    setAlternatives(variants);
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
              <Badge tone="info">{score.mode}</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Number of voices</Label>
              <Select value={score.voices.length} onChange={(event) => resizeVoices(Number(event.target.value))}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
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
              <Label>Seed</Label>
              <Input
                type="number"
                value={score.seed ?? 17}
                onChange={(event) => updateScore((current) => ({ ...current, seed: Number(event.target.value) }))}
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
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generate}>Generate</Button>
          <Button variant="secondary" onClick={generateAlternatives}>Generate 5 Alternatives</Button>
          <Button variant="secondary" onClick={() => evaluate()}>Evaluate</Button>
        </div>

        {alternatives.length ? (
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Alternative Candidates</div>
            </CardHeader>
            <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {alternatives.map((candidate, index) => {
                const result = evaluateCounterpoint(candidate);
                return (
                  <button
                    key={candidate.id}
                    onClick={() => {
                      setScore(candidate);
                      evaluate();
                      setAlternatives([]);
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm hover:bg-slate-50"
                  >
                    <div className="font-semibold">Alternative {index + 1}</div>
                    <div className="text-slate-600">{candidate.title}</div>
                    <div className="mt-2 text-xs text-slate-500">Score {result.score} · Violations {result.violations.length}</div>
                  </button>
                );
              })}
            </CardBody>
          </Card>
        ) : null}

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

        <Card>
          <CardHeader><div className="text-sm font-semibold">Verified Examples</div></CardHeader>
          <CardBody className="text-sm text-slate-600">
            The default example library only includes scores verified to evaluate with zero violations. Study examples remain available in the Examples page, but they are not loaded automatically.
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
