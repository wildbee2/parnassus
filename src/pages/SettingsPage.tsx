import { AppShell } from '../components/layout/AppShell';
import { Badge, Card, CardBody, CardHeader, Input, Label, Select } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

const SETTINGS = [
  {
    key: 'permitRepeatedNotes',
    label: 'Permit repeated notes',
    description: 'Lets the generator accept repeated pitches when the line needs a stable step or an expressive turn.'
  },
  {
    key: 'permitVoiceCrossing',
    label: 'Permit voice crossing',
    description: 'Allows one voice to move past another voice’s line for brief gestures or denser textures.'
  },
  {
    key: 'permitVoiceOverlap',
    label: 'Permit voice overlap',
    description: 'Allows a voice to momentarily occupy the previous range of another voice while avoiding full crossing.'
  },
  {
    key: 'allowCambiata',
    label: 'Allow cambiata',
    description: 'Permits the generator to use the decorative cambiata pattern, which introduces a controlled dissonant turn.'
  },
  {
    key: 'allowAccentedPassingDissonance',
    label: 'Allow accented passing dissonance',
    description: 'Lets strong-beat dissonances survive when they function as a deliberate passing motion in less strict profiles.'
  },
  {
    key: 'strictSuspensionResolution',
    label: 'Strict suspension resolution',
    description: 'Requires fourth-species suspensions to resolve downward by step instead of allowing looser resolutions.'
  },
  {
    key: 'musicaFicta',
    label: 'Musica ficta',
    description: 'Lets the system assume editorial accidentals when that reduces harsh intervals or improves cadence shape.'
  }
] as const;

export function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  return (
    <AppShell
      title="Settings"
      inspector={
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          <div className="font-medium text-slate-700">Persistence</div>
          <div className="mt-2">These settings are saved in localStorage and apply to generation, evaluation, and suggestions until you change them.</div>
        </div>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Rule behavior</div>
                <div className="text-xs text-slate-500">These toggles change what the generator and evaluator treat as acceptable.</div>
              </div>
              <Badge tone="info">Core rules</Badge>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 lg:grid-cols-2">
            {SETTINGS.map((setting) => (
              <div key={setting.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">{setting.label}</div>
                    <div className="text-sm text-slate-600">{setting.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[setting.key as keyof typeof settings])}
                    onChange={(event) => updateSettings({ [setting.key]: event.target.checked } as never)}
                    className="mt-1 h-4 w-4"
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">Strictness tuning</div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <Label>Strictness profile</Label>
              <Select
                value={settings.strictnessProfile}
                onChange={(event) => updateSettings({ strictnessProfile: event.target.value as typeof settings.strictnessProfile })}
              >
                <option value="strict">Pedagogical Strict</option>
                <option value="balanced">Balanced</option>
                <option value="permissive">Historically Permissive</option>
              </Select>
              <div className="text-sm text-slate-600">
                Controls how aggressively the generator rejects borderline sonorities when it searches for a solution.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Direct perfect strictness</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.directPerfectStrictness}
                onChange={(event) => updateSettings({ directPerfectStrictness: Number(event.target.value) })}
              />
              <div className="text-sm text-slate-600">
                Higher values make direct motion into fifths and octaves harder for the generator to accept.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
