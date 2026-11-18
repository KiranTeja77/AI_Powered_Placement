import { Building2, Users } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/features/auth/auth-context'
import { ROLE_LABEL } from '../users/schemas'
import { useAdminOverview } from '../queries'

const LINKS = [
  {
    to: '/admin/users',
    label: 'Users',
    hint: 'Create staff accounts and manage who can sign in',
    icon: Users,
  },
  {
    to: '/admin/departments',
    label: 'Departments',
    hint: 'The departments students and faculty belong to',
    icon: Building2,
  },
]

export default function AdminOverviewPage() {
  const me = useCurrentUser()
  const overview = useAdminOverview()
  const o = overview.data

  return (
    <>
      <PageHeader title="Overview" description={`Signed in as ${me.fullName}.`} />
      {overview.isError ? (
        <div className="mb-6 max-w-5xl rounded-md border border-border bg-surface">
          <ErrorState
            title="The overview could not be loaded"
            onRetry={() => void overview.refetch()}
          />
        </div>
      ) : (
        <div className="mb-6 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Users" value={o?.totalUsers} loading={overview.isLoading} />
          <StatCard label="Active" value={o?.activeUsers} loading={overview.isLoading} />
          <StatCard label="Inactive" value={o?.inactiveUsers} loading={overview.isLoading} />
          <StatCard
            label="Invites pending"
            value={o?.pendingInvites}
            hint="Staff who have not chosen a password"
            loading={overview.isLoading}
          />
        </div>
      )}
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Section title="Users by role">
          {overview.isLoading ? (
            <div role="status" aria-label="Loading users by role" className="space-y-2 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : o ? (
            <table className="w-full text-base">
              <caption className="sr-only">Accounts by role</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted text-sm text-text-muted">
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Active
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {o.usersByRole.map((r) => (
                  <tr key={r.role} className="border-b border-border last:border-b-0">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal text-text">
                      {ROLE_LABEL[r.role] ?? r.role}
                    </th>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.active}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Section>
        <Section title="Go to">
          <ul className="divide-y divide-border">
            {LINKS.map(({ to, label, hint, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted">
                  <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span>
                    <span className="block text-base font-medium text-primary">{label}</span>
                    <span className="block text-sm text-text-muted">{hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
