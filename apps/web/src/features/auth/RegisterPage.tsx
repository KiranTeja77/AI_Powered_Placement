import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { PasswordField } from '@/components/PasswordField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authApi } from '@/lib/api/auth-api'
import { applyFieldErrors, describeError } from '@/lib/api/errors'
import { AuthLayout, FormError } from './AuthLayout'
import { registerSchema, type RegisterValues } from './schemas'

const FIELDS = [
  'fullName',
  'email',
  'rollNo',
  'departmentId',
  'graduationYear',
  'password',
] as const

export default function RegisterPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const departments = useQuery({ queryKey: ['departments'], queryFn: authApi.departments })

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null)
    try {
      await authApi.register({
        fullName: values.fullName,
        email: values.email,
        rollNo: values.rollNo,
        departmentId: values.departmentId,
        graduationYear: values.graduationYear,
        password: values.password,
      })
      navigate('/login', {
        replace: true,
        state: { notice: 'Account created. Sign in to continue.' },
      })
    } catch (error) {
      if (!applyFieldErrors(error, FIELDS, setError)) setFormError(describeError(error))
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="For students. Staff and recruiters receive their accounts from an administrator."
      footer={
        <p>
          Already registered?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="College email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Roll number"
          className="font-mono"
          error={errors.rollNo?.message}
          {...register('rollNo')}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="departmentId">Department</Label>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id="departmentId"
                  aria-invalid={errors.departmentId ? true : undefined}
                  aria-describedby={errors.departmentId ? 'departmentId-error' : undefined}
                  disabled={departments.isLoading}
                >
                  <SelectValue
                    placeholder={
                      departments.isLoading ? 'Loading departments' : 'Select a department'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.departmentId && (
            <p id="departmentId-error" className="text-sm text-danger">
              {errors.departmentId.message}
            </p>
          )}
          {departments.isError && (
            <p className="text-sm text-danger">Departments could not be loaded. Reload the page.</p>
          )}
        </div>
        <TextField
          label="Graduation year"
          type="number"
          inputMode="numeric"
          error={errors.graduationYear?.message}
          {...register('graduationYear', { valueAsNumber: true })}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters with a letter and a number"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <FormError message={formError} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
