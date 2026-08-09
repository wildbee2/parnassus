import * as Tone from 'tone';
import { useRef, useState } from 'react';
import type { CounterpointScore } from '../../counterpoint/model';
import { Button, Card, CardBody, CardHeader, Input, Label } from '../ui';

export function PlaybackControls({ score }: { score: CounterpointScore }) {
  const [playing, setPlaying] = useState(false);
  const [tempo, setTempo] = useState(score.tempoBpm);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  async function play() {
    await Tone.start();
    Tone.Transport.cancel();
    Tone.Transport.bpm.value = tempo;
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth().toDestination();
    }
    const synth = synthRef.current;
    for (const voice of score.voices) {
      for (const note of voice.notes) {
        Tone.Transport.schedule((time: number) => {
          synth.triggerAttackRelease(Tone.Frequency(note.midi, 'midi').toNote(), note.durationTicks / score.ticksPerWhole, time, 0.7);
        }, note.startTick / score.ticksPerWhole * 2);
      }
    }
    Tone.Transport.start();
    setPlaying(true);
  }

  function pause() {
    Tone.Transport.pause();
    setPlaying(false);
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
