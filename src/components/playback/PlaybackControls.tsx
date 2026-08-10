import * as Tone from 'tone';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CounterpointScore } from '../../counterpoint/model';
import { Button, Card, CardBody, CardHeader, Input, Label } from '../ui';

type InstrumentPreset = 'piano' | 'harpsichord' | 'flute';

function createInstrument(preset: InstrumentPreset): Tone.PolySynth {
  const synth = new Tone.PolySynth().toDestination();
  const voice = synth as unknown as {
    set?: (options: Record<string, unknown>) => void;
  };
  if (preset === 'harpsichord') {
    voice.set?.({
      oscillator: { type: 'square8' },
      envelope: { attack: 0.002, decay: 0.18, sustain: 0.0, release: 0.08 }
    });
  } else if (preset === 'flute') {
    voice.set?.({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.08, decay: 0.12, sustain: 0.55, release: 0.45 }
    });
  } else {
    voice.set?.({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.22, sustain: 0.3, release: 0.25 }
    });
  }
  return synth;
}

export function PlaybackControls({ score }: { score: CounterpointScore }) {
  const [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(score.tempoBpm);
  const [instrument, setInstrument] = useState<InstrumentPreset>('piano');
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const timerRefs = useRef<number[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  function clearPlaybackState() {
    for (const timerId of timerRefs.current) {
      window.clearTimeout(timerId);
    }
    timerRefs.current = [];
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    synthRef.current?.releaseAll?.();
    setPlaying(false);
  }

  useEffect(() => () => {
    clearPlaybackState();
  }, []);

  async function play() {
    await Tone.start();
    clearPlaybackState();
    if (!synthRef.current) {
      synthRef.current = createInstrument(instrument);
    }
    const synth = synthRef.current;
    const beatsPerSecond = tempo / 60;
    const secondsPerWhole = 4 / beatsPerSecond;
    const endTick = Math.max(...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)), score.ticksPerWhole);
    for (const voice of score.voices) {
      for (const note of voice.notes) {
        const startDelay = (note.startTick / score.ticksPerWhole) * secondsPerWhole * 1000;
        const durationSeconds = (note.durationTicks / score.ticksPerWhole) * secondsPerWhole;
        const timerId = window.setTimeout(() => {
          synth.triggerAttackRelease(Tone.Frequency(note.midi, 'midi').toNote(), durationSeconds, undefined, 0.7);
        }, startDelay);
        timerRefs.current.push(timerId);
      }
    }
    stopTimerRef.current = window.setTimeout(() => {
      clearPlaybackState();
    }, Math.max(250, (endTick / score.ticksPerWhole) * secondsPerWhole * 1000 + 250));
    setPlaying(true);
  }

  function pause() {
    clearPlaybackState();
  }

  return (
    <Card>
      <CardHeader>
        <div className="text-sm font-semibold">Playback</div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={play} disabled={playing}>Play</Button>
          <Button onClick={pause} variant="secondary">Pause</Button>
        </div>
        <div className="space-y-2">
          <Label>Tempo</Label>
          <Input type="number" value={tempo} onChange={(event) => setTempo(Number(event.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Instrument</Label>
          <select
            value={instrument}
            onChange={(event) => {
              setInstrument(event.target.value as InstrumentPreset);
              synthRef.current?.dispose?.();
              synthRef.current = createInstrument(event.target.value as InstrumentPreset);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="piano">Piano-like</option>
            <option value="harpsichord">Harpsichord-like</option>
            <option value="flute">Flute-like</option>
          </select>
        </div>
      </CardBody>
    </Card>
  );
}
