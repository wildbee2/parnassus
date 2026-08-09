import { useMemo, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Input, Badge } from '../components/ui';
import { getRuleMetadata } from '../counterpoint/rules';

export function RulesPage() {
  const [query, setQuery] = useState('');
  const rules = useMemo(() => getRuleMetadata().filter((rule) => `${rule.id} ${rule.title} ${rule.summary}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <AppShell title="Rule Reference" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">This application models a pedagogically strict, Fux-inspired species-counterpoint system. Fux's rules are an abstraction of Renaissance practice and should not be treated as a complete description of Palestrina's compositional language.</div>}>
      <div className="space-y-4">
        <Input placeholder="Search rules..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{rule.title}</div>
                  <Badge tone={rule.defaultSeverity === 'error' ? 'danger' : rule.defaultSeverity === 'warning' ? 'warning' : 'info'}>{rule.id}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-2 text-sm text-slate-600">
                <div>{rule.summary}</div>
                <div>{rule.detailedExplanation}</div>
                <div className="text-xs text-slate-500">Category {rule.category} · Configurable {rule.configurable ? 'yes' : 'no'}</div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

