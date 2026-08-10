import { Link } from 'react-router-dom';
import { canonicalExamples } from '../examples/builtInExamples';
import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Button, Badge } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function LandingPage() {
  const { recentExercises, loadExample } = useAppStore();
  return (
    <AppShell title="Gradus Counterpoint Studio" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Choose a workspace mode from the sidebar.</div>}>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Landing</div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2">
            <Link to="/playback" className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-soft transition hover:translate-y-[-1px]">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-300">Example Playback</div>
              <div className="mt-3 text-2xl font-semibold">Play and inspect examples</div>
              <p className="mt-2 max-w-md text-sm text-slate-300">Load a verified counterpoint example, edit it, and hear it with different playback presets.</p>
            </Link>
            <Link to="/evaluate" className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-soft transition hover:translate-y-[-1px]">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Evaluate Counterpoint</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">Inspect and repair passages</div>
              <p className="mt-2 max-w-md text-sm text-slate-600">Paste, edit, import, or load an example and get explainable rule-based analysis.</p>
            </Link>
          </CardBody>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><div className="text-sm font-semibold">Recent Exercises</div></CardHeader>
            <CardBody className="space-y-2">
              {recentExercises.length ? recentExercises.map((exercise) => (
                <button key={exercise.id} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => loadExample(canonicalExamples[0])}>
                  {exercise.title}
                </button>
              )) : <div className="text-sm text-slate-500">No recent exercises yet.</div>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><div className="text-sm font-semibold">Quick Start</div></CardHeader>
            <CardBody className="space-y-2">
              {canonicalExamples.slice(0, 4).map((example) => (
                <button key={example.id} onClick={() => loadExample(example)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                  <span>{example.title}</span>
                  <Badge tone="info">{example.voices.length} voices</Badge>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
