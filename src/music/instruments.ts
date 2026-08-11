import * as Tone from 'tone';

export type InstrumentPreset = 'grand_piano' | 'organ' | 'trumpet' | 'pipe_organ';

export const INSTRUMENT_PRESETS: Array<{ value: InstrumentPreset; label: string }> = [
  { value: 'grand_piano', label: 'Grand piano' },
  { value: 'trumpet', label: 'Trumpet' },
  { value: 'organ', label: 'Organ' },
  { value: 'pipe_organ', label: 'Pipe organ' }
];

export function createInstrument(preset: InstrumentPreset): Tone.PolySynth {
  const synth = new Tone.PolySynth().toDestination();
  const voice = synth as unknown as {
    set?: (options: Record<string, unknown>) => void;
  };
  if (preset === 'pipe_organ') {
    voice.set?.({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.08, decay: 0.12, sustain: 0.55, release: 0.45 }
    });
  } else if (preset === 'organ') {
    voice.set?.({
      oscillator: { type: 'sawtooth4' },
      envelope: { attack: 0.05, decay: 0.14, sustain: 0.58, release: 0.35 }
    });
  } else if (preset === 'trumpet') {
    voice.set?.({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.03, decay: 0.16, sustain: 0.45, release: 0.2 }
    });
  } else {
    voice.set?.({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.22, sustain: 0.3, release: 0.25 }
    });
  }
  return synth;
}
