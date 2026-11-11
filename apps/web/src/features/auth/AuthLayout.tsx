import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/** Narrow form on the page background with a text wordmark. No illustration, no hero. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link to="/" className="text-md font-semibold text-text">
          PlaceWise
        </Link>
      </header>
      <main className="mx-auto w-full max-w-sm px-4 pt-8 pb-16">
        <h1 className="text-auth font-semibold text-text">{title}</h1>
        {description && <p className="mt-2 text-base text-text-muted">{description}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-base text-text-muted">{footer}</div>}
      </main>
    </div>
  )
}

/** Form-level error summary shown above the submit button. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-sm border border-danger px-3 py-2 text-base text-danger">
      {message}
    </p>
  )
}
