import * as Tone from 'tone';
import { useEffect, useRef, useState } from 'react';
import type { CounterpointScore } from '../../counterpoint/model';
import { Button, Card, CardBody, CardHeader, Input, Label } from '../ui';

export function PlaybackControls({ score }: { score: CounterpointScore }) {
  const [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(score.tempoBpm);
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
      synthRef.current = new Tone.PolySynth().toDestination();
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
      </CardBody>
    </Card>
  );
}
