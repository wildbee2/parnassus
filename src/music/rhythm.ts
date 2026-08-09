export type RhythmUnit = 1 | 2 | 4 | 8;

export function unitToTicks(unit: RhythmUnit, ticksPerWhole = 480): number {
  return ticksPerWhole / unit;
}

export function ticksToUnit(ticks: number, ticksPerWhole = 480): RhythmUnit {
  const ratio = ticksPerWhole / ticks;
  if (ratio >= 7) return 8;
  if (ratio >= 3) return 4;
  if (ratio >= 1.5) return 2;
  return 1;
}

export function beatLabelFromTick(tick: number, ticksPerWhole: number): string {
  const measure = Math.floor(tick / ticksPerWhole) + 1;
  const beat = Math.floor(((tick % ticksPerWhole) / ticksPerWhole) * 4) + 1;
  return `m. ${measure} beat ${beat}`;
}

