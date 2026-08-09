import { AppShell } from '../components/layout/AppShell';
import { Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  return (
    <AppShell title="Settings" inspector={<div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Settings persist in localStorage.</div>}>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ['permitRepeatedNotes', 'Permit repeated notes'],
          ['permitVoiceCrossing', 'Permit voice crossing'],
          ['permitVoiceOverlap', 'Permit voice overlap'],
          ['allowCambiata', 'Allow cambiata'],
          ['allowAccentedPassingDissonance', 'Allow accented passing dissonance'],
          ['strictSuspensionResolution', 'Strict suspension resolution'],
          ['musicaFicta', 'Musica ficta']
        ].map(([key, label]) => (
          <Card key={key}>
            <CardHeader><div className="text-sm font-semibold">{label}</div></CardHeader>
            <CardBody>
              <input
                type="checkbox"
                checked={Boolean(settings[key as keyof typeof settings])}
                onChange={(event) => updateSettings({ [key]: event.target.checked } as never)}
              />
            </CardBody>
          </Card>
        ))}
        <Card>
          <CardHeader><div className="text-sm font-semibold">Strictness</div></CardHeader>
          <CardBody className="space-y-3">
            <div className="space-y-2">
              <Label>Strictness profile</Label>
              <Select value={settings.strictnessProfile} onChange={(event) => updateSettings({ strictnessProfile: event.target.value as typeof settings.strictnessProfile })}>
                <option value="strict">Pedagogical Strict</option>
                <option value="balanced">Balanced</option>
                <option value="permissive">Historically Permissive</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direct perfect strictness</Label>
              <Input type="number" step="0.1" value={settings.directPerfectStrictness} onChange={(event) => updateSettings({ directPerfectStrictness: Number(event.target.value) })} />
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

