import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { notifyUnavailable } from '@/lib/notify'
import { PASSWORD_POLICY, settingsSchema, type SettingsValues } from './schemas'

const SWITCHES = [
  ['fullScreenRequired', 'Require full screen', 'New assessments start with full screen required.'],
  [
    'tabSwitchLogging',
    'Log tab and window switches',
    'New assessments record when a student leaves the tab.',
  ],
  ['cameraRequired', 'Require camera', 'New assessments ask students to pass a camera check.'],
  [
    'microphoneRequired',
    'Require microphone',
    'New assessments ask students to pass a microphone check.',
  ],
] as const

export default function SettingsPage() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      attemptMonths: '',
      proctoringDays: '',
      analysisMonths: '',
      fullScreenRequired: true,
      tabSwitchLogging: true,
      cameraRequired: false,
      microphoneRequired: false,
      warningThreshold: '3',
    },
  })

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Settings' }]}
        title="Settings"
        description="Platform-wide defaults. Faculty can change proctoring for a single assessment."
        action={
          <Button type="submit" form="settings-form">
            Save settings
          </Button>
        }
      />
      <form
        id="settings-form"
        noValidate
        onSubmit={handleSubmit(notifyUnavailable)}
        className="max-w-4xl space-y-6"
      >
        <Section
          title="Data retention"
          description="How long records are kept before they are deleted. Current values are not available yet."
        >
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <TextField
              label="Assessment attempts (months)"
              inputMode="numeric"
              error={errors.attemptMonths?.message}
              {...register('attemptMonths')}
            />
            <TextField
              label="Proctoring events (days)"
              inputMode="numeric"
              error={errors.proctoringDays?.message}
              {...register('proctoringDays')}
            />
            <TextField
              label="Resume analyses (months)"
              inputMode="numeric"
              error={errors.analysisMonths?.message}
              {...register('analysisMonths')}
            />
          </div>
        </Section>

        <Section title="Proctoring defaults">
          <div className="divide-y divide-border px-4">
            {SWITCHES.map(([name, label, help]) => (
              <div key={name} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <Label htmlFor={name}>{label}</Label>
                  <p className="text-sm text-text-muted">{help}</p>
                </div>
                <Controller
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <Switch id={name} checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            ))}
            <div className="max-w-xs py-3">
              <TextField
                label="Warning threshold"
                inputMode="numeric"
                hint="Events after which an attempt is flagged for review."
                error={errors.warningThreshold?.message}
                {...register('warningThreshold')}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Password policy"
          description="Set in the platform and shown here for reference. It cannot be changed from this screen."
        >
          <ul className="list-disc space-y-1 py-4 pr-4 pl-9 text-base text-text">
            {PASSWORD_POLICY.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Section>

        <p className="text-sm text-text-muted">Saving is not available yet.</p>
      </form>
    </>
  )
}
