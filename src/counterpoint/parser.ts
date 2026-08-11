import { pitchNameToMidi } from '../music/pitch';
import type { CounterpointScore, NoteEvent, Voice, Species } from './model';
import type { InstrumentPreset } from '../music/instruments';

export interface ParsedTextScore {
  score: CounterpointScore;
  errors: string[];
}

function parseVoiceLabel(label: string): { name: string; species?: Species } {
  const match = label.match(/^(.*?)(?:\s*[\[(](first|second|third|fourth|fifth)[)\]])?$/i);
  if (!match) {
    return { name: label.trim() };
  }
  const name = match[1].trim();
  const species = match[2]?.toLowerCase() as Species | undefined;
  return { name, species };
}

function parseTokens(line: string): Array<{ pitch: string; duration: number; tieToNext: boolean }> {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^([A-Ga-g][#b]?-?\d+)(?:\/(1|2|4|8))?(~)?$/);
      if (!match) {
        throw new Error(`${token} is not a recognized note token`);
      }
      const [, pitch, duration = '1', tie] = match;
      return { pitch, duration: Number(duration), tieToNext: Boolean(tie) };
    });
}

export function parseScoreText(text: string, baseScore: CounterpointScore): ParsedTextScore {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const score = structuredClone(baseScore);
  const errors: string[] = [];
  for (const line of lines) {
    const [label, rhs] = line.split(':').map((part) => part.trim());
    const { name, species } = parseVoiceLabel(label);
    const voice = score.voices.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase() || candidate.id.toLowerCase() === name.toLowerCase());
    if (!voice || !rhs) continue;
    if (species && voice.role === 'counterpoint') {
      voice.species = species;
    }
    const tokens = parseTokens(rhs);
    voice.notes = tokens.map((token, index) => {
      const startTick = index * (score.ticksPerWhole / token.duration);
      const durationTicks = score.ticksPerWhole / token.duration;
      return {
        id: `${voice.id}-${index}`,
        midi: pitchNameToMidi(token.pitch),
        startTick,
        durationTicks,
        tiedFromPrevious: index > 0 && token.duration === tokens[index - 1].duration ? false : undefined,
        tiedToNext: token.tieToNext
      } satisfies NoteEvent;
    });
  }
  return { score, errors };
}

export function scoreToText(score: CounterpointScore): string {
  return score.voices
    .map((voice) => `${voice.name}: ${voice.notes.map((note) => `${note.midi}`).join(' ')}`)
    .join('\n');
}

export function makeVoice(id: string, name: string, role: Voice['role'], species: Species | undefined, rangeMinMidi: number, rangeMaxMidi: number, instrument?: InstrumentPreset): Voice {
  return { id, name, role, species, instrument, rangeMinMidi, rangeMaxMidi, notes: [] };
}
