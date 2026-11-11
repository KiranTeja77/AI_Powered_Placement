import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PasswordField } from '@/components/PasswordField'
import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api/auth-api'
import { ApiError, applyFieldErrors, describeError } from '@/lib/api/errors'
import { AuthLayout, FormError } from './AuthLayout'
import { resetPasswordSchema, type ResetPasswordValues } from './schemas'

const REQUEST_NEW = (
  <p>
    <Link to="/forgot-password" className="text-primary hover:underline">
      Request a new link
    </Link>
  </p>
)

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [linkInvalid, setLinkInvalid] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) })

  if (!token || linkInvalid) {
    return (
      <AuthLayout title="Reset link not valid" footer={REQUEST_NEW}>
        <p role="alert" className="text-base text-text">
          This reset link is invalid or has expired. Links work once and expire after 30 minutes.
        </p>
      </AuthLayout>
    )
  }

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError(null)
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword })
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. Sign in with your new password.' },
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_token') setLinkInvalid(true)
      else if (!applyFieldErrors(error, ['newPassword'], setError))
        setFormError(describeError(error))
    }
  }

  return (
    <AuthLayout title="Choose a new password" description="You will be signed out of all devices.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
