import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Button, Badge } from '../components/ui';
import { canonicalExamples, studyExamples } from '../examples/builtInExamples';
import { useAppStore } from '../store/useAppStore';

export function ExamplesPage() {
  const loadExample = useAppStore((state) => state.loadExample);
  const [showStudyExamples, setShowStudyExamples] = useState(false);
  return (
    <AppShell title="Examples" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">The default library contains verified examples that evaluate with zero violations. It now covers five species examples plus Bach-inspired 3-voice and 4-voice textures. Study examples are hidden unless you open them.</div>}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Canonical Examples</div>
              <Badge tone="success">Zero violations</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {canonicalExamples.map((example) => (
                <Card key={example.id} className="shadow-none">
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
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Study Examples</div>
              <Button variant="secondary" onClick={() => setShowStudyExamples((value) => !value)}>
                {showStudyExamples ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="text-sm text-slate-600">These are intentionally flawed and are not loaded by default.</div>
            {showStudyExamples ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {studyExamples.map((example) => (
                  <Card key={example.id} className="shadow-none">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{example.title}</div>
                        <Badge tone="warning">Study</Badge>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      <div className="text-sm text-slate-600">{example.mode} · seed {example.seed ?? 'n/a'}</div>
                      <Button onClick={() => loadExample(example)}>Load</Button>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
