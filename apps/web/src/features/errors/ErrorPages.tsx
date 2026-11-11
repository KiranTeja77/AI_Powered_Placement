import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ROLE_HOME } from '@/features/auth/roles'

function StatusPage({
  code,
  title,
  children,
}: {
  code: string
  title: string
  children: ReactNode
}) {
  const { user } = useAuth()
  const home = user ? ROLE_HOME[user.role] : '/login'
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link to="/" className="text-md font-semibold text-text">
          PlaceWise
        </Link>
      </header>
      <main className="mx-auto max-w-sm px-4 pt-8">
        <p className="font-mono text-sm text-text-muted">{code}</p>
        <h1 className="mt-1 text-auth font-semibold text-text">{title}</h1>
        <p className="mt-2 text-base text-text-muted">{children}</p>
        <Button asChild className="mt-6">
          <Link to={home}>{user ? 'Go to your home' : 'Go to sign in'}</Link>
        </Button>
      </main>
    </div>
  )
}

export function ForbiddenPage() {
  return (
    <StatusPage code="403" title="You do not have access">
      Your account does not have permission to open this page. If you think this is a mistake,
      contact your administrator.
    </StatusPage>
  )
}

export function NotFoundPage() {
  return (
    <StatusPage code="404" title="Page not found">
      The page you are looking for does not exist or has moved.
    </StatusPage>
  )
}

export function ServerErrorPage() {
  return (
    <StatusPage code="500" title="Something went wrong">
      An unexpected error occurred. Try again, and contact support if it keeps happening.
    </StatusPage>
  )
}
