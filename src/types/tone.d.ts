declare module 'tone' {
  export function start(): Promise<void>;
  export const Transport: {
    cancel(): void;
    start(): void;
    pause(): void;
    schedule(callback: (time: number) => void, time: number): void;
    bpm: { value: number };
  };
  export class PolySynth {
    constructor(...args: unknown[]);
    toDestination(): PolySynth;
    triggerAttackRelease(note: string, duration: number, time?: number, velocity?: number): void;
    releaseAll(): void;
  }
  export const Frequency: (value: number, unit: string) => { toNote(): string };
}
