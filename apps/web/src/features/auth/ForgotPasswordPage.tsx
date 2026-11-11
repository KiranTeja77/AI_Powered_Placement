import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api/auth-api'
import { describeError } from '@/lib/api/errors'
import { AuthLayout, FormError } from './AuthLayout'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas'

const BACK = (
  <p>
    <Link to="/login" className="text-primary hover:underline">
      Back to sign in
    </Link>
  </p>
)

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFormError(null)
    try {
      await authApi.forgotPassword(values)
      setSentTo(values.email)
    } catch (error) {
      setFormError(describeError(error))
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={BACK}>
        <p role="status" className="text-base text-text">
          If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on
          its way. The link works once and expires in 30 minutes.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email and we will send a link to choose a new password."
      footer={BACK}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormError message={formError} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  )
}
