import { useMemo } from 'react';
import type { CounterpointScore, NoteEvent } from '../../counterpoint/model';
import { midiToNoteName } from '../../music/pitch';
import { beatLabelFromTick, ticksToUnit } from '../../music/rhythm';
import { Badge, Card, CardBody, CardHeader } from '../ui';

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function trackLengthTicks(score: CounterpointScore): number {
  return Math.max(
    ...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)),
    score.ticksPerWhole * 8
  );
}

function gridUnitTicks(score: CounterpointScore): number {
  const noteDurations = score.voices.flatMap((voice) => voice.notes.map((note) => note.durationTicks)).filter((ticks) => ticks > 0);
  const baseUnit = score.ticksPerWhole / 4;
  return noteDurations.reduce((unit, duration) => gcd(unit, duration), baseUnit) || baseUnit;
}

function durationLabel(durationTicks: number, ticksPerWhole: number): string {
  const unit = ticksToUnit(durationTicks, ticksPerWhole);
  switch (unit) {
    case 1:
      return 'whole';
    case 2:
      return 'half';
    case 4:
      return 'quarter';
    case 8:
      return 'eighth';
    default:
      return `${durationTicks} ticks`;
  }
}

export function ScoreGrid({
  score,
  onSelectNote,
  selectedNoteId,
  onUpdateNote
}: {
  score: CounterpointScore;
  selectedNoteId?: string;
  onSelectNote: (voiceId: string, noteId: string) => void;
  onUpdateNote: (voiceId: string, noteId: string, patch: Partial<NoteEvent>) => void;
}) {
  const unitTicks = useMemo(() => gridUnitTicks(score), [score]);
  const columns = useMemo(() => Math.max(1, Math.ceil(trackLengthTicks(score) / unitTicks)), [score, unitTicks]);
  const rulerTicks = useMemo(() => Array.from({ length: columns }, (_, index) => index * unitTicks), [columns, unitTicks]);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{score.title}</div>
            <div className="text-xs text-slate-500">Example playback and score editor with duration-scaled note blocks</div>
          </div>
          <Badge tone="neutral">{columns} time slices</Badge>
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <div className="min-w-[960px]">
          <div className="grid border-b border-slate-200 bg-slate-50 text-xs text-slate-500" style={{ gridTemplateColumns: `220px repeat(${columns}, minmax(0, 1fr))` }}>
            <div className="px-3 py-2 font-medium">Voice / Time</div>
            {rulerTicks.map((tick, index) => {
              const beat = beatLabelFromTick(tick, score.ticksPerWhole);
              const label = tick % score.ticksPerWhole === 0 || tick % (score.ticksPerWhole / 4) === 0 ? beat : '';
              return (
                <div key={index} className="px-1 py-2 text-center leading-tight">
                  <div>{label}</div>
                </div>
              );
            })}
          </div>
          {score.voices.map((voice) => (
            <div key={voice.id} className="grid border-b border-slate-100" style={{ gridTemplateColumns: `220px repeat(${columns}, minmax(0, 1fr))` }}>
              <div className="border-r border-slate-200 bg-white px-3 py-3">
                <div className="text-sm font-semibold">{voice.name}</div>
                <div className="text-xs text-slate-500">{voice.role === 'cantus' ? 'Cantus firmus' : `${voice.species ?? 'first'} species`} · {midiToNoteName(voice.rangeMinMidi)} - {midiToNoteName(voice.rangeMaxMidi)}</div>
              </div>
              {voice.notes.map((note) => {
                const active = selectedNoteId === note.id;
                const spanColumns = Math.max(1, Math.round(note.durationTicks / unitTicks));
                return (
                  <button
                    key={note.id}
                    onClick={() => onSelectNote(voice.id, note.id)}
                    style={{ gridColumn: `${Math.round(note.startTick / unitTicks) + 2} / span ${spanColumns}` }}
                    className={`min-h-20 border-r border-slate-100 px-3 py-2 text-left transition ${active ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'bg-white hover:bg-slate-50'}`}
                  >
                    <div className="flex h-full flex-col justify-between gap-1">
                      <div>
                        <div className="text-sm font-semibold">{midiToNoteName(note.midi)}</div>
                        <div className="text-[11px] text-slate-500">{durationLabel(note.durationTicks, score.ticksPerWhole)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {note.tiedFromPrevious ? <span className="text-amber-600">tie from prev</span> : null}
                        {note.tiedToNext ? <span className="text-emerald-600">tie next</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
