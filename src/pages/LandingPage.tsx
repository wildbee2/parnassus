import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Badge } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function LandingPage() {
  const { recentExercises } = useAppStore();
  return (
    <AppShell title="Gradus Counterpoint Studio" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Choose a workspace mode from the sidebar.</div>}>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Landing</div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2">
            <Link to="/lab" className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-soft transition hover:translate-y-[-1px]">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-300">Lab</div>
              <div className="mt-3 text-2xl font-semibold">Run search simulations</div>
              <p className="mt-2 max-w-md text-sm text-slate-300">Configure voicings, species, bars, scale, and instruments, then search for valid patterns.</p>
            </Link>
            <Link to="/rules" className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-soft transition hover:translate-y-[-1px]">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Rule Reference</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">Inspect the rule set</div>
              <p className="mt-2 max-w-md text-sm text-slate-600">Review the active counterpoint rules and see which ones are core versus configurable.</p>
            </Link>
            <Link to="/settings" className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-soft transition hover:translate-y-[-1px]">
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Settings</div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">Tune generation</div>
              <p className="mt-2 max-w-md text-sm text-slate-600">Adjust strictness, heuristic mode, and rule behavior to change how the search behaves.</p>
            </Link>
          </CardBody>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><div className="text-sm font-semibold">Recent Exercises</div></CardHeader>
            <CardBody className="space-y-2">
              {recentExercises.length ? recentExercises.map((exercise) => (
                <button key={exercise.id} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                  {exercise.title}
                </button>
              )) : <div className="text-sm text-slate-500">No recent exercises yet.</div>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><div className="text-sm font-semibold">Workspace Overview</div></CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-600">
              <div>The Lab is the primary workspace for search and generation.</div>
              <div>Rules and settings are available in the sidebar.</div>
              <div>Playback and evaluation routes still exist, but they are no longer surfaced in the main UI.</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
