import type { CounterpointScore } from '../counterpoint/model';

export function exportScoreMusicXml(score: CounterpointScore): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${score.title}</work-title></work>
  <identification><encoding><software>Gradus Counterpoint Studio</software></encoding></identification>
</score-partwise>`;
}

export function musicXmlSupported(): boolean {
  return true;
}

