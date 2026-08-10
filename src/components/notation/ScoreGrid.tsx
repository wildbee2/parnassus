import { useMemo } from 'react';
import type { CounterpointScore, NoteEvent, Voice } from '../../counterpoint/model';
import { midiToNoteName } from '../../music/pitch';
import { Badge, Card, CardBody, CardHeader } from '../ui';

function ticksToColumns(score: CounterpointScore): number {
  const maxTick = Math.max(...score.voices.flatMap((voice) => voice.notes.map((note) => note.startTick + note.durationTicks)), score.ticksPerWhole * 8);
  return Math.max(1, Math.ceil(maxTick / (score.ticksPerWhole / 2)));
}

function noteAt(voice: Voice, tick: number): NoteEvent | undefined {
  return voice.notes.find((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
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
  const columns = useMemo(() => ticksToColumns(score), [score]);
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{score.title}</div>
            <div className="text-xs text-slate-500">Seeded species score editor</div>
          </div>
          <Badge tone="neutral">{columns} grid positions</Badge>
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <div className="min-w-[960px]">
          <div className="grid border-b border-slate-200 bg-slate-50 text-xs text-slate-500" style={{ gridTemplateColumns: `220px repeat(${columns}, minmax(44px, 1fr))` }}>
            <div className="px-3 py-2 font-medium">Voice / Tick</div>
            {Array.from({ length: columns }, (_, index) => (
              <div key={index} className="px-2 py-2 text-center">{index + 1}</div>
            ))}
          </div>
          {score.voices.map((voice) => (
            <div key={voice.id} className="grid border-b border-slate-100" style={{ gridTemplateColumns: `220px repeat(${columns}, minmax(44px, 1fr))` }}>
              <div className="border-r border-slate-200 bg-white px-3 py-3">
                <div className="text-sm font-semibold">{voice.name}</div>
                <div className="text-xs text-slate-500">{voice.role === 'cantus' ? 'Cantus firmus' : `${voice.species ?? 'first'} species`} · {midiToNoteName(voice.rangeMinMidi)} - {midiToNoteName(voice.rangeMaxMidi)}</div>
              </div>
              {Array.from({ length: columns }, (_, colIndex) => {
                const tick = colIndex * (score.ticksPerWhole / 2);
                const note = noteAt(voice, tick);
                const active = note && selectedNoteId === note.id;
                return (
                  <button
                    key={colIndex}
                    onClick={() => note && onSelectNote(voice.id, note.id)}
                    className={`min-h-20 border-r border-slate-100 px-2 py-2 text-left transition ${active ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'hover:bg-slate-50'} ${note ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {note ? (
                      <div>
                        <div className="text-sm font-semibold">{midiToNoteName(note.midi)}</div>
                        <div className="text-[11px] text-slate-500">dur {note.durationTicks}</div>
                        {note.tiedFromPrevious ? <div className="text-[11px] text-amber-600">tie from prev</div> : null}
                        {note.tiedToNext ? <div className="text-[11px] text-emerald-600">tie next</div> : null}
                      </div>
                    ) : null}
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
