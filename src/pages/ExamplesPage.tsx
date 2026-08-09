import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Button, Badge } from '../components/ui';
import { builtInExamples } from '../examples/builtInExamples';
import { useAppStore } from '../store/useAppStore';

export function ExamplesPage() {
  const loadExample = useAppStore((state) => state.loadExample);
  return (
    <AppShell title="Examples" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Load a good or flawed passage for analysis.</div>}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {builtInExamples.map((example) => (
          <Card key={example.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{example.title}</div>
                <Badge tone="neutral">{example.voices.length} voices</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="text-sm text-slate-600">{example.mode} · seed {example.seed ?? 'n/a'}</div>
              <Button onClick={() => loadExample(example)}>Load</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

