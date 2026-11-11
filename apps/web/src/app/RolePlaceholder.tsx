import { Construction } from 'lucide-react'
import { useLocation } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useCurrentUser } from '@/features/auth/auth-context'
import { ROLE_HOME } from '@/features/auth/roles'
import { findNavItem } from './nav'

/**
 * Stands in for a screen that is built in a later phase of this milestone. It shows no data and
 * makes no request. Replace the route with the real page when it exists.
 */
export function RolePlaceholder({ title: fixedTitle }: { title?: string }) {
  const user = useCurrentUser()
  const { pathname } = useLocation()
  const item = findNavItem(user.role, pathname)
  const title = fixedTitle ?? item?.label ?? 'Page'
  const home = ROLE_HOME[user.role]

  return (
    <>
      <PageHeader
        breadcrumbs={
          item && item.to !== home ? [{ label: 'Home', to: home }, { label: title }] : undefined
        }
        title={title}
      />
      <div className="rounded-md border border-border bg-surface">
        <EmptyState
          icon={Construction}
          title="This screen is not available yet"
          description="It is part of this release and will appear here once it is built."
        />
      </div>
    </>
  )
}
