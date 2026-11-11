import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PasswordField } from '@/components/PasswordField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { describeError } from '@/lib/api/errors'
import { useAuth } from './auth-context'
import { AuthLayout, FormError } from './AuthLayout'
import { ROLE_HOME } from './roles'
import { loginSchema, type LoginValues } from './schemas'

export default function LoginPage() {
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const notice = (location.state as { notice?: string } | null)?.notice

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    try {
      const user = await login(values)
      toast.dismiss()
      navigate(ROLE_HOME[user.role], { replace: true })
    } catch (error) {
      setFormError(describeError(error))
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use your college email or roll number."
      footer={
        <p>
          New student?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-sm border border-border bg-surface px-3 py-2 text-base text-text"
        >
          {notice}
        </p>
      )}
      {sessionExpired && !notice && (
        <p
          role="status"
          className="mb-4 rounded-sm border border-border bg-surface px-3 py-2 text-base text-text"
        >
          Your session has ended. Sign in again to continue.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <TextField
          label="Email or roll number"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password
          </Link>
        </div>
        <FormError message={formError} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
