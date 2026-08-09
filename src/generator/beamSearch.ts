export interface BeamState<T> {
  value: T;
  score: number;
}

export function beamSearch<T>(initial: BeamState<T>[], expand: (state: BeamState<T>) => BeamState<T>[], beamWidth: number): BeamState<T>[] {
  let beam = initial;
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const next = beam.flatMap(expand).sort((a, b) => b.score - a.score);
    if (!next.length) break;
    beam = next.slice(0, beamWidth);
    if (beam.every((state) => state.score > 9999)) break;
  }
  return beam;
}

