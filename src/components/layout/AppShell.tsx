import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRef } from 'react';
import { Badge, Button, Card } from '../ui';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeftRight, FileDown, FileUp, Zap } from 'lucide-react';
import { exportScoreJson, importScoreJson } from '../../importExport/json';

const navItems = [
  { to: '/playback', label: 'Example Playback' },
  { to: '/evaluate', label: 'Evaluate' },
  { to: '/lab', label: 'Lab' },
  { to: '/rules', label: 'Rule Reference' },
  { to: '/settings', label: 'Settings' }
];

export function AppShell({
  title,
  inspector,
  children
}: {
  title: string;
  inspector?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const { score } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadJson() {
    const defaultName = `${score.title || 'counterpoint-score'}.json`;
    const filename = window.prompt('Export filename', defaultName)?.trim() || defaultName;
    const safeName = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
    const blob = new Blob([exportScoreJson(score)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const raw = await file.text();
      const parsed = importScoreJson(raw);
      const store = useAppStore.getState();
      store.setScore(parsed);
      store.setSelectedNoteId(undefined);
      store.setSelectedVoiceId(undefined);
      store.evaluate();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import JSON');
    }
  }

  function openImportDialog() {
    fileInputRef.current?.click();
  }

  return (
    <div className="min-h-full">
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white/75 p-4 backdrop-blur lg:min-h-full lg:w-64 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Gradus Counterpoint Studio</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">Play back, hear, and analyze counterpoint examples.</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`block rounded-xl px-3 py-2 text-sm ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 space-y-3">
            <Card className="p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="info">Seed {score.seed ?? 17}</Badge>
                <Badge tone="neutral">{score.mode}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Profile: {useAppStore.getState().settings.strictnessProfile} · Heuristics: {useAppStore.getState().settings.heuristicMode}
              </p>
            </Card>
          </div>
        </aside>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (file) await importJson(file);
                }}
              />
              <Button onClick={openImportDialog} variant="secondary"><FileUp size={16} />Import JSON</Button>
              <Button onClick={downloadJson} variant="secondary"><FileDown size={16} />Export JSON</Button>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                <ArrowLeftRight size={14} />
                <span>{score.voices.length} voices</span>
                <Zap size={14} />
                <span>{score.tempoBpm} bpm</span>
              </div>
            </div>
          </header>
          <div className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_360px]">
            <main className="min-w-0">{children}</main>
            <aside className="min-w-0">{inspector}</aside>
          </div>
        </div>
      </div>
    </div>
  );
}
