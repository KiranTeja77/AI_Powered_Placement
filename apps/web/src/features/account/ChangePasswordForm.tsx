import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PasswordField } from '@/components/PasswordField'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { FormError } from '@/features/auth/AuthLayout'
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas'
import { authApi } from '@/lib/api/auth-api'
import { applyFieldErrors, describeError } from '@/lib/api/errors'

const FIELDS = ['currentPassword', 'newPassword'] as const

export function ChangePasswordForm() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) })

  const onSubmit = async (values: ChangePasswordValues) => {
    setFormError(null)
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
    } catch (error) {
      if (!applyFieldErrors(error, FIELDS, setError)) setFormError(describeError(error))
      return
    }
    // The API ends every session when the password changes, so sign in again.
    await logout()
    // A toast, not navigation state: signing out also triggers the route guard's own redirect to
    // /login, which would replace any state passed here.
    toast('Password changed. Sign in with your new password.')
    navigate('/login', { replace: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid max-w-sm gap-4">
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters with a letter and a number"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <FormError message={formError} />
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving' : 'Change password'}
        </Button>
      </div>
    </form>
  )
}
