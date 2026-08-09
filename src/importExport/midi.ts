import { Midi } from '@tonejs/midi';
import type { CounterpointScore, Voice } from '../counterpoint/model';

export function exportScoreMidi(score: CounterpointScore): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(score.tempoBpm);
  for (const voice of score.voices) {
    const track = midi.addTrack();
    track.name = voice.name;
    for (const note of voice.notes) {
      track.addNote({
        midi: note.midi,
        time: note.startTick / score.ticksPerWhole * 2,
        duration: note.durationTicks / score.ticksPerWhole * 2,
        velocity: 0.8
      });
    }
  }
  return midi.toArray();
}

export async function importScoreMidi(buffer: ArrayBuffer, baseScore: CounterpointScore): Promise<CounterpointScore> {
  const midi = new Midi(buffer);
  const score: CounterpointScore = structuredClone(baseScore);
  midi.tracks.forEach((track, index) => {
    const voice = score.voices[index];
    if (!voice) return;
    voice.notes = track.notes.map((note, noteIndex) => ({
      id: `${voice.id}-${noteIndex}`,
      midi: note.midi,
      startTick: Math.round(note.time / 2 * score.ticksPerWhole),
      durationTicks: Math.round(note.duration / 2 * score.ticksPerWhole)
    }));
  });
  return score;
}

export function voiceToMidiTrack(voice: Voice, ticksPerWhole: number): { name: string; notes: Array<{ midi: number; time: number; duration: number }> } {
  return {
    name: voice.name,
    notes: voice.notes.map((note) => ({
      midi: note.midi,
      time: note.startTick / ticksPerWhole * 2,
      duration: note.durationTicks / ticksPerWhole * 2
    }))
  };
}

