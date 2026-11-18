import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { SelectField } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormError } from '@/features/auth/AuthLayout'
import { ApiError, applyFieldErrors, describeError } from '@/lib/api/errors'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { useCreateUser } from '../queries'
import { createUserSchema, STAFF_ROLES, type CreateUserValues } from './schemas'

const BLANK: CreateUserValues = { fullName: '', email: '', role: 'FACULTY', departmentId: '' }

/** Creates a staff account. The person gets an email to choose their own password. */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const departments = useDepartmentOptions()
  const create = useCreateUser()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({ resolver: zodResolver(createUserSchema), defaultValues: BLANK })
  const role = useWatch({ control, name: 'role' })

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset(BLANK)
      setFormError(null)
    }
  }

  const submit = async (values: CreateUserValues) => {
    setFormError(null)
    try {
      await create.mutateAsync({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        role: values.role,
        departmentId: values.role === 'FACULTY' ? values.departmentId : undefined,
      })
      toast(`Account created. A link to set a password was emailed to ${values.email.trim()}.`)
      close(false)
    } catch (error) {
      if (applyFieldErrors(error, ['fullName', 'email', 'role', 'departmentId'], setError)) return
      setFormError(
        error instanceof ApiError && error.status === 503
          ? 'The email could not be sent, so the account was not created. Try again in a moment.'
          : describeError(error),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Create user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a staff account</DialogTitle>
          <DialogDescription>
            They get an email with a link to choose their own password. Nobody, including you, sees
            it. Students register themselves.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(submit)} className="grid gap-3">
          <TextField
            label="Full name"
            autoComplete="off"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <SelectField
                label="Role"
                value={field.value}
                onChange={field.onChange}
                options={[...STAFF_ROLES]}
                error={errors.role?.message}
              />
            )}
          />
          {role === 'FACULTY' && (
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <SelectField
                  label="Department"
                  value={field.value}
                  onChange={field.onChange}
                  options={departments.options}
                  placeholder={
                    departments.isLoading ? 'Loading departments' : 'Select a department'
                  }
                  error={errors.departmentId?.message}
                />
              )}
            />
          )}
          <FormError message={formError} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
