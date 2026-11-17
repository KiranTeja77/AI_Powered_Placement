import { useId } from 'react'
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { TextField } from '@/components/TextField'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { AssessmentValues } from './schemas'

type SwitchName =
  'fullScreenRequired' | 'tabSwitchLogging' | 'cameraRequired' | 'microphoneRequired'

const SWITCHES: { name: SwitchName; label: string; help: string }[] = [
  {
    name: 'fullScreenRequired',
    label: 'Require full screen',
    help: 'Students must enter full screen to start. Leaving it shows a warning and is logged for review.',
  },
  {
    name: 'tabSwitchLogging',
    label: 'Log tab and window switches',
    help: 'Records when a student leaves the test tab, with the time and how long they were away.',
  },
  {
    name: 'cameraRequired',
    label: 'Require camera',
    help: 'Students must pass a camera check before starting. Nothing is recorded in this version.',
  },
  {
    name: 'microphoneRequired',
    label: 'Require microphone',
    help: 'Students must pass a microphone check before starting. Nothing is recorded in this version.',
  },
]

function Row({
  control,
  name,
  label,
  help,
}: {
  control: Control<AssessmentValues>
  name: SwitchName
  label: string
  help: string
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-help`} className="text-sm text-text-muted">
          {help}
        </p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            id={id}
            aria-describedby={`${id}-help`}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  )
}

interface ProctoringFieldsProps {
  control: Control<AssessmentValues>
  register: UseFormRegister<AssessmentValues>
  errors: FieldErrors<AssessmentValues>
}

/** What the monitoring covers for this assessment, each setting explained. */
export function ProctoringFields({ control, register, errors }: ProctoringFieldsProps) {
  return (
    <div>
      <p className="text-sm text-text-muted">
        Alerts are signals for review, not proof of misconduct. Students see these settings before
        they consent.
      </p>
      <div className="divide-y divide-border">
        {SWITCHES.map((s) => (
          <Row key={s.name} control={control} {...s} />
        ))}
      </div>
      <div className="max-w-xs pt-3">
        <TextField
          label="Warning threshold"
          inputMode="numeric"
          hint="Number of events after which an attempt is flagged for review."
          error={errors.warningThreshold?.message}
          {...register('warningThreshold')}
        />
      </div>
    </div>
  )
}
