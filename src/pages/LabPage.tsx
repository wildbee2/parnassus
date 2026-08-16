import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { ScoreGrid } from '../components/notation/ScoreGrid';
import { PlaybackControls } from '../components/playback/PlaybackControls';
import { useAppStore } from '../store/useAppStore';
import { searchLabCounterpoint } from '../counterpoint/labSearch';
import { normalizeSeed } from '../counterpoint/seedMutation';
import { scanSeedDensity } from '../counterpoint/seedDensity';
import type { Species } from '../counterpoint/model';
import type { ModeName } from '../music/mode';
import type { InstrumentPreset } from '../music/instruments';
import { INSTRUMENT_PRESETS } from '../music/instruments';
import { exportScoreJson } from '../importExport/json';

const MODE_OPTIONS: ModeName[] = ['dorian', 'ionian', 'mixolydian', 'aeolian', 'phrygian', 'lydian', 'major', 'natural_minor'];
const SPECIES_OPTIONS: Species[] = ['first', 'second', 'third', 'fourth', 'fifth'];

function randomSpecies(): Species {
  return SPECIES_OPTIONS[Math.floor(Math.random() * SPECIES_OPTIONS.length)] ?? 'first';
}

function resizeSpeciesSelections(totalVoices: number, current: Species[]): Species[] {
  const required = Math.max(1, totalVoices - 1);
  const next = current.slice(0, required);
  while (next.length < required) {
    next.push(randomSpecies());
  }
  return next;
}

function createSpeciesSelections(totalVoices: number): Species[] {
  return Array.from({ length: Math.max(1, totalVoices - 1) }, () => randomSpecies());
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
  const { score, setScore, updateScore, setSelectedNoteId, setSelectedVoiceId } = useAppStore();
  const [totalVoices, setTotalVoices] = useState(3);
  const [bars, setBars] = useState(8);
  const [mode, setMode] = useState<ModeName>('mixolydian');
  const [speciesSelections, setSpeciesSelections] = useState<Species[]>(() => createSpeciesSelections(3));
  const [instrumentSelections, setInstrumentSelections] = useState<InstrumentPreset[]>(() => Array.from({ length: 3 }, () => 'grand_piano'));
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string>('Configure the lab search and run a simulation.');
  const [progress, setProgress] = useState<string>('');
  const [labResult, setLabResult] = useState<string | null>(null);
  const [currentSeed, setCurrentSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000_000));
  const [runSeed, setRunSeed] = useState<number | null>(null);
  const [scanRadius, setScanRadius] = useState(24);
  const [scanStep, setScanStep] = useState(1);
  const [scanAttempts, setScanAttempts] = useState(2500);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    centerSeed: number;
    radius: number;
    step: number;
    tested: number;
    hits: Array<{ runSeed: number; winningSeed: number; attempts: number }>;
  } | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSpeciesSelections((current) => resizeSpeciesSelections(totalVoices, current));
  }, [totalVoices]);

  useEffect(() => {
    setInstrumentSelections((current) => resizeInstrumentSelections(totalVoices, current));
  }, [totalVoices]);

  useEffect(() => () => {
    searchAbortRef.current?.abort();
  }, []);

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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Better odds: Mixolydian with first or second species, Dorian with first or second species, and Ionian or Aeolian with first species.
              This is inferred from the generator behavior, not guaranteed.
            </div>
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
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    const nextRunSeed = normalizeSeed(currentSeed);
    setCurrentSeed(nextRunSeed);
    setRunSeed(nextRunSeed);
    setMessage(`Searching for a valid pattern with run seed ${nextRunSeed}...`);
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
        seed: nextRunSeed,
        signal: controller.signal,
        onAttempt: (attempt, maxAttempts) => {
          setProgress(`Attempt ${attempt} of ${maxAttempts}`);
        }
      });

      if (controller.signal.aborted) {
        setMessage('Search paused.');
        return;
      }

      if (!result) {
        setMessage(`No valid patterns were found after ${maxAttempts} attempts.`);
        return;
      }

      setScore(result.score);
      setSelectedNoteId(undefined);
      setSelectedVoiceId(undefined);
      setLabResult(exportScoreJson(result.score));
      setMessage(`Found a valid pattern after ${result.attempts} attempts using seed ${result.seed}.`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessage('Search paused.');
        return;
      }
      throw error;
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      setIsSearching(false);
    }
  }

  function stopLabSearch() {
    searchAbortRef.current?.abort();
  }

  async function scanSeedNeighborhood() {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsScanning(true);
    const nextCenterSeed = normalizeSeed(currentSeed);
    setCurrentSeed(nextCenterSeed);
    setMessage(`Scanning seeds near ${nextCenterSeed}...`);
    setProgress('');
    setScanResult(null);

    try {
      const result = await scanSeedDensity({
        centerSeed: nextCenterSeed,
        radius: scanRadius,
        step: scanStep,
        maxAttempts: scanAttempts,
        totalVoices,
        species: speciesSelections.slice(0, cpCount),
        bars,
        mode,
        heuristicMode: 'humanLike',
        instruments: instrumentSelections,
        signal: controller.signal,
        onProgress: (tested, total, runSeedValue) => {
          setProgress(`Scanning seed ${tested} of ${total}: ${runSeedValue}`);
        }
      });

      if (controller.signal.aborted) {
        setMessage('Seed scan paused.');
        return;
      }

      setScanResult(result);
      setMessage(`Seed scan complete: ${result.hits.length} hits in ${result.tested} seeds near ${result.centerSeed}.`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessage('Seed scan paused.');
        return;
      }
      throw error;
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      setIsScanning(false);
    }
  }

  function updateInstrument(index: number, instrument: InstrumentPreset) {
    setInstrumentSelections((current) => {
      const next = [...current];
      next[index] = instrument;
      return resizeInstrumentSelections(totalVoices, next);
    });

    const nextScore = structuredClone(score);
    if (nextScore.voices[index]) {
      nextScore.voices[index].instrument = instrument;
      updateScore(() => nextScore);
      setLabResult(exportScoreJson(nextScore));
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
                <div className="text-xs text-slate-500">Searches use the editable seed below, a random cantus firmus, human-like heuristics, and historically permissive filtering.</div>
                <div className="mt-1 text-xs text-slate-500">Last run seed: {runSeed ?? 'not started yet'}</div>
              </div>
              <Badge tone="info">{isSearching ? 'Searching' : 'Ready'}</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label>Current seed</Label>
              <Input
                type="number"
                min={0}
                max={999999999}
                value={currentSeed}
                onChange={(event) => {
                  const nextSeed = Number(event.target.value);
                  if (!Number.isFinite(nextSeed)) return;
                  setCurrentSeed(normalizeSeed(nextSeed));
                }}
                disabled={isSearching}
              />
            </div>
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
                <Button onClick={scanSeedNeighborhood} disabled={isSearching || isScanning} variant="secondary" className="w-full">
                  {isScanning ? 'Scanning...' : 'Scan neighborhood'}
                </Button>
                <Button onClick={stopLabSearch} disabled={!isSearching && !isScanning} variant="secondary" className="w-full">
                  Stop
                </Button>
                <Button onClick={exportLabResult} disabled={!labResult || isSearching || isScanning} variant="secondary" className="w-full">
                  Export Lab JSON
                </Button>
              </div>
            </CardBody>
          </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Seed Density Scan</div>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Radius</Label>
              <Input
                type="number"
                min={0}
                max={5000}
                value={scanRadius}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setScanRadius(Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0);
                }}
                disabled={isSearching || isScanning}
              />
            </div>
            <div className="space-y-2">
              <Label>Step</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={scanStep}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setScanStep(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
                disabled={isSearching || isScanning}
              />
            </div>
            <div className="space-y-2">
              <Label>Attempts per seed</Label>
              <Input
                type="number"
                min={1}
                max={50000}
                value={scanAttempts}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setScanAttempts(Number.isFinite(nextValue) ? Math.max(1, nextValue) : 1);
                }}
                disabled={isSearching || isScanning}
              />
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div>Use this to sample nearby run seeds and see whether winners cluster around the current seed.</div>
              <div>Current scan center: {normalizeSeed(currentSeed)}</div>
            </div>
          </CardBody>
          {scanResult ? (
            <CardBody className="pt-0">
              <div className="mb-3 text-sm text-slate-600">
                Tested {scanResult.tested} seeds. Found {scanResult.hits.length} hits.
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {scanResult.hits.length > 0 ? scanResult.hits.map((hit) => (
                  <button
                    key={`${hit.runSeed}-${hit.winningSeed}`}
                    type="button"
                    onClick={() => setCurrentSeed(hit.runSeed)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900 transition hover:bg-emerald-100"
                  >
                    <div className="font-medium">Run seed {hit.runSeed}</div>
                    <div className="text-xs text-emerald-700">Winning seed {hit.winningSeed} · attempt {hit.attempts}</div>
                  </button>
                )) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    No hits in the scanned neighborhood.
                  </div>
                )}
              </div>
            </CardBody>
          ) : null}
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
                    onChange={(event) => updateInstrument(index, event.target.value as InstrumentPreset)}
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
