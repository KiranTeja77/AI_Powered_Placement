import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/auth-context'
import { notifyUnavailable } from '../common/notify'
import { DepartmentField } from '../profile/DepartmentField'
import { basicsSchema, type BasicsValues } from '../profile/schemas'

/** Step 1. Prefilled from the account; saving is not available yet, and the step says so. */
export function BasicsStep({ onNext }: { onNext: () => void }) {
  const user = useCurrentUser()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicsValues>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      departmentId: user.department?.id ?? '',
      graduationYear: user.student?.graduationYear,
    },
  })
  const next = () => {
    notifyUnavailable()
    onNext()
  }
  return (
    <form noValidate onSubmit={handleSubmit(next)} className="grid max-w-md gap-4">
      <DepartmentField control={control} name="departmentId" error={errors.departmentId?.message} />
      <TextField
        label="Graduation year"
        type="number"
        inputMode="numeric"
        error={errors.graduationYear?.message}
        {...register('graduationYear', { valueAsNumber: true })}
      />
      <p className="text-sm text-text-muted">
        Saving is not available yet, so changes here are not stored.
      </p>
      <div>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  )
}
