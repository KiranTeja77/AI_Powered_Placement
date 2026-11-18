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

export interface ChoosePasswordCopy {
  title: string
  description: string
  invalidTitle: string
  invalidText: string
  newLink: string
  button: string
  notice: string
}

const REQUEST_NEW = (label: string) => (
  <p>
    <Link to="/forgot-password" className="text-primary hover:underline">
      {label}
    </Link>
  </p>
)

/** One page for both emailed links: reset a forgotten password, or set the first password. */
export function ChoosePasswordPage({ copy }: { copy: ChoosePasswordCopy }) {
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
      <AuthLayout title={copy.invalidTitle} footer={REQUEST_NEW(copy.newLink)}>
        <p role="alert" className="text-base text-text">
          {copy.invalidText}
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
        state: { notice: copy.notice },
      })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'invalid_token') setLinkInvalid(true)
      else if (!applyFieldErrors(error, ['newPassword'], setError))
        setFormError(describeError(error))
    }
  }

  return (
    <AuthLayout title={copy.title} description={copy.description}>
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
          {isSubmitting ? 'Saving' : copy.button}
        </Button>
      </form>
    </AuthLayout>
  )
}
