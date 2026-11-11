import { Navigate, Outlet, useLocation } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { Role } from '@/lib/api/types'
import { useAuth } from './auth-context'
import { ROLE_HOME } from './roles'

function FullPageLoading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-5xl space-y-3 p-6">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

/** Requires a signed-in user, optionally of one of the given roles. Wrong role goes to /403. */
export function RequireRole({ roles }: { roles?: readonly Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoading />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/403" replace />
  return <Outlet />
}

/** Login, register and similar: signed-in users go straight to their home. */
export function PublicOnly() {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageLoading />
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}

/** The root path sends each visitor where they belong. */
export function RootRedirect() {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageLoading />
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />
}
