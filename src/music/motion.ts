export type MotionType = 'contrary' | 'oblique' | 'similar' | 'parallel' | 'static';

export interface MotionAnalysis {
  type: MotionType;
  voiceA: number;
  voiceB: number;
  prevIntervalSemitones: number;
  nextIntervalSemitones: number;
  sameDirection: boolean;
  outerHiddenPerfect: boolean;
}

export function classifyMotion(prevA: number, nextA: number, prevB: number, nextB: number): MotionAnalysis {
  const deltaA = nextA - prevA;
  const deltaB = nextB - prevB;
  const dirA = Math.sign(deltaA);
  const dirB = Math.sign(deltaB);
  const prevIntervalSemitones = prevB - prevA;
  const nextIntervalSemitones = nextB - nextA;
  let type: MotionType = 'static';
  if (dirA === 0 && dirB === 0) type = 'static';
  else if (dirA === 0 || dirB === 0) type = 'oblique';
  else if (dirA !== dirB) type = 'contrary';
  else if (prevIntervalSemitones === nextIntervalSemitones) type = 'parallel';
  else type = 'similar';
  return {
    type,
    voiceA: prevA,
    voiceB: prevB,
    prevIntervalSemitones,
    nextIntervalSemitones,
    sameDirection: dirA !== 0 && dirA === dirB,
    outerHiddenPerfect: false
  };
}

export function isPerfectIntervalSemitoneClass(semitones: number): boolean {
  const mod = ((Math.abs(semitones) % 12) + 12) % 12;
  return mod === 0 || mod === 7;
}

export function isHiddenPerfect(prevA: number, nextA: number, prevB: number, nextB: number): boolean {
  const deltaA = nextA - prevA;
  const deltaB = nextB - prevB;
  const similar = Math.sign(deltaA) !== 0 && Math.sign(deltaA) === Math.sign(deltaB);
  const upperLeap = Math.abs(deltaB) > 2;
  const nextPerfect = isPerfectIntervalSemitoneClass(nextB - nextA);
  return similar && upperLeap && nextPerfect;
}

