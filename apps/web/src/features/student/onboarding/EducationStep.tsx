import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { notifyUnavailable } from '../common/notify'
import { educationSchema, type EducationValues } from '../profile/schemas'

/** Step 2. Self-reported education. Your college's verified record is separate. */
export function EducationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EducationValues>({ resolver: zodResolver(educationSchema) })
  const next = () => {
    notifyUnavailable()
    onNext()
  }
  return (
    <form noValidate onSubmit={handleSubmit(next)} className="grid max-w-md gap-4">
      <TextField
        label="Degree"
        placeholder="B.Tech"
        error={errors.degree?.message}
        {...register('degree')}
      />
      <TextField
        label="College"
        autoComplete="organization"
        error={errors.institution?.message}
        {...register('institution')}
      />
      <TextField
        label="CGPA"
        type="number"
        step="0.01"
        inputMode="decimal"
        error={errors.cgpa?.message}
        {...register('cgpa', { valueAsNumber: true })}
      />
      <TextField
        label="12th percentage"
        type="number"
        step="0.01"
        inputMode="decimal"
        error={errors.twelfthPercent?.message}
        {...register('twelfthPercent', { valueAsNumber: true })}
      />
      <p className="text-sm text-text-muted">
        Saving is not available yet. Your college verifies marks separately.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  )
}
