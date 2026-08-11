import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { useAppStore } from '../store/useAppStore';
import { searchLabCounterpoint } from '../counterpoint/labSearch';
import type { Species } from '../counterpoint/model';
import type { ModeName } from '../music/mode';
import type { InstrumentPreset } from '../music/instruments';
import { INSTRUMENT_PRESETS } from '../music/instruments';
import { exportScoreJson } from '../importExport/json';

const MODE_OPTIONS: ModeName[] = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor'];

function resizeSpeciesSelections(totalVoices: number, current: Species[]): Species[] {
  const required = Math.max(1, totalVoices - 1);
  const next = current.slice(0, required);
  while (next.length < required) {
    next.push('first');
  }
  return next;
}

function resizeInstrumentSelections(totalVoices: number, current: InstrumentPreset[]): InstrumentPreset[] {
  const next = current.slice(0, totalVoices);
  while (next.length < totalVoices) {
    next.push('grand_piano');
  }
  return next;
}

function downloadJson(filename: string, contents: string) {
  const safeName = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LabPage() {
  const { score, setScore, setSelectedNoteId, setSelectedVoiceId } = useAppStore();
  const [totalVoices, setTotalVoices] = useState(2);
  const [bars, setBars] = useState(8);
  const [mode, setMode] = useState<ModeName>('dorian');
  const [speciesSelections, setSpeciesSelections] = useState<Species[]>(['first']);
  const [instrumentSelections, setInstrumentSelections] = useState<InstrumentPreset[]>(['grand_piano', 'grand_piano']);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string>('Configure the lab search and run a simulation.');
  const [progress, setProgress] = useState<string>('');
  const [labResult, setLabResult] = useState<string | null>(null);

  useEffect(() => {
    setSpeciesSelections((current) => resizeSpeciesSelections(totalVoices, current));
  }, [totalVoices]);

  useEffect(() => {
    setInstrumentSelections((current) => resizeInstrumentSelections(totalVoices, current));
  }, [totalVoices]);

  const cpCount = Math.max(1, totalVoices - 1);

  const inspector = useMemo(
    () => (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Lab Notes</div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-600">
            <p>This page runs a repeated suggestion loop against a random cantus firmus until it finds a score that passes the current human-like search filter.</p>
            <p>The lab always keeps the core counterpoint checks active. Only the softer stylistic rules are relaxed during search.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Current Score</div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-slate-600">
            <div>Voices: {score.voices.length}</div>
            <div>Mode: {score.mode}</div>
            <div>Target bars: {bars}</div>
          </CardBody>
        </Card>
      </div>
    ),
    [bars, score]
  );

  async function runLabSearch() {
    setIsSearching(true);
    setMessage('Searching for a valid pattern...');
    setProgress('');
    setLabResult(null);

    try {
      const maxAttempts = 50000;
      const result = await searchLabCounterpoint({
        totalVoices,
        species: speciesSelections.slice(0, cpCount),
        bars,
        mode,
        heuristicMode: 'humanLike',
        instruments: instrumentSelections,
        maxAttempts,
        onAttempt: (attempt, maxAttempts) => {
          setProgress(`Attempt ${attempt} of ${maxAttempts}`);
        }
      });

      if (!result) {
        setMessage(`No valid patterns were found after ${maxAttempts} attempts.`);
        return;
      }

      setScore(result.score);
      setSelectedNoteId(undefined);
      setSelectedVoiceId(undefined);
      setLabResult(exportScoreJson(result.score));
      setMessage(`Found a valid pattern after ${result.attempts} attempts using seed ${result.seed}.`);
    } finally {
      setIsSearching(false);
    }
  }

  function exportLabResult() {
    if (!labResult) return;
    const filename = `${score.title || 'lab-result'}.json`;
    downloadJson(filename, labResult);
  }

  return (
    <AppShell title="Lab" inspector={inspector}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Lab Controls</div>
                <div className="text-xs text-slate-500">Searches use a random seed, a random cantus firmus, human-like heuristics, and historically permissive filtering.</div>
              </div>
              <Badge tone="info">{isSearching ? 'Searching' : 'Ready'}</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Total voicings</Label>
              <Select value={totalVoices} onChange={(event) => setTotalVoices(Number(event.target.value))} disabled={isSearching}>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bars</Label>
              <Input type="number" min={2} max={32} value={bars} onChange={(event) => setBars(Number(event.target.value))} disabled={isSearching} />
            </div>
            <div className="space-y-2">
              <Label>Primary musical scale</Label>
              <Select value={mode} onChange={(event) => setMode(event.target.value as ModeName)} disabled={isSearching}>
                {MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <Button onClick={runLabSearch} disabled={isSearching} className="w-full">
                {isSearching ? 'Running...' : 'Run simulation'}
              </Button>
              <Button onClick={exportLabResult} disabled={!labResult || isSearching} variant="secondary" className="w-full">
                Export Lab JSON
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Voicing Setup</div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: totalVoices }, (_, index) => {
              const isCantus = index === 0;
              return (
                <div key={index} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Label>{isCantus ? 'Cantus firmus' : `Counterpoint ${index}`}</Label>
                  <Select
                    value={instrumentSelections[index] ?? 'grand_piano'}
                    onChange={(event) => {
                      const next = [...instrumentSelections];
                      next[index] = event.target.value as InstrumentPreset;
                      setInstrumentSelections(resizeInstrumentSelections(totalVoices, next));
                    }}
                    disabled={isSearching}
                  >
                    {INSTRUMENT_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                  {!isCantus ? (
                    <Select
                      value={speciesSelections[index - 1] ?? 'first'}
                      onChange={(event) => {
                        const next = [...speciesSelections];
                        next[index - 1] = event.target.value as Species;
                        setSpeciesSelections(resizeSpeciesSelections(totalVoices, next));
                      }}
                      disabled={isSearching}
                    >
                      <option value="first">First species</option>
                      <option value="second">Second species</option>
                      <option value="third">Third species</option>
                      <option value="fourth">Fourth species</option>
                      <option value="fifth">Fifth species</option>
                    </Select>
                  ) : null}
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-2">
          <div className={`rounded-xl border px-4 py-3 text-sm ${message.startsWith('No valid') ? 'border-red-200 bg-red-50 text-red-700' : message.startsWith('Found') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <div>{message}</div>
            {progress ? <div className="mt-1 text-xs opacity-80">{progress}</div> : null}
          </div>
        </div>

        <ScoreGrid
          score={score}
          selectedNoteId={useAppStore.getState().selectedNoteId}
          onSelectNote={(voiceId, noteId) => {
            useAppStore.getState().setSelectedVoiceId(voiceId);
            useAppStore.getState().setSelectedNoteId(noteId);
          }}
          onUpdateNote={(voiceId, noteId, patch) => {
            useAppStore.getState().updateNote(voiceId, noteId, patch);
          }}
        />

        <PlaybackControls score={score} />
      </div>
    </AppShell>
  );
}
