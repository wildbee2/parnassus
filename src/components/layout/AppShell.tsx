import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge, Button, Card } from '../ui';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeftRight, FileDown, FileUp, Plus, Play, Redo2, Undo2, Zap, Volume2, Trash2 } from 'lucide-react';

const navItems = [
  { to: '/', label: 'New Exercise' },
  { to: '/generate', label: 'Generate' },
  { to: '/evaluate', label: 'Evaluate' },
  { to: '/examples', label: 'Examples' },
  { to: '/rules', label: 'Rule Reference' },
  { to: '/settings', label: 'Settings' }
];

export function AppShell({
  title,
  inspector,
  children,
  onPlay,
  onPause,
  onExportJson,
  onImportJson,
  onClear
}: {
  title: string;
  inspector?: ReactNode;
  children: ReactNode;
  onPlay?: () => void;
  onPause?: () => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
  onClear?: () => void;
}) {
  const location = useLocation();
  const { undo, redo, score } = useAppStore();
  return (
    <div className="min-h-full">
      <div className="flex min-h-full flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white/75 p-4 backdrop-blur lg:min-h-full lg:w-64 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Gradus Counterpoint Studio</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">Generate, hear, and analyze species counterpoint.</p>
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
              <p className="mt-2 text-xs text-slate-600">Profile: {useAppStore.getState().settings.strictnessProfile}</p>
            </Card>
          </div>
        </aside>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => useAppStore.getState().clearScore()} variant="secondary"><Plus size={16} />New</Button>
              <Button onClick={() => undo()} variant="secondary"><Undo2 size={16} />Undo</Button>
              <Button onClick={() => redo()} variant="secondary"><Redo2 size={16} />Redo</Button>
              <Button onClick={onPlay} variant="secondary"><Play size={16} />Play</Button>
              <Button onClick={onPause} variant="secondary"><Volume2 size={16} />Pause</Button>
              <Button onClick={onImportJson} variant="secondary"><FileUp size={16} />Import JSON</Button>
              <Button onClick={onExportJson} variant="secondary"><FileDown size={16} />Export JSON</Button>
              <Button onClick={onClear} variant="danger"><Trash2 size={16} />Clear</Button>
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

