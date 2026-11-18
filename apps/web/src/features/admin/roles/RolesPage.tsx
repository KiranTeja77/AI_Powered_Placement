import { Info, ShieldQuestion } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionMatrix } from '../queries'
import { PermissionGrid } from './PermissionGrid'

export default function RolesPage() {
  const matrix = usePermissionMatrix()

  let body
  if (matrix.isLoading) {
    body = (
      <div role="status" aria-label="Loading permissions" className="space-y-px p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  } else if (matrix.isError) {
    body = (
      <ErrorState
        title="The permission matrix could not be loaded"
        onRetry={() => void matrix.refetch()}
      />
    )
  } else if (!matrix.data || matrix.data.permissions.length === 0) {
    body = (
      <EmptyState
        icon={ShieldQuestion}
        title="No permissions to show"
        description="Each role and what it may do will be listed here, with a switch per permission."
      />
    )
  } else {
    body = <PermissionGrid matrix={matrix.data} />
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Roles and permissions' }]}
        title="Roles and permissions"
        description="What each role can do, as the API enforces it today."
      />
      <p
        role="note"
        className="mb-4 flex max-w-5xl items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-base text-text"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
        This matrix is read only. It comes from the rules the API actually applies, so it cannot
        disagree with them. Changing permissions is not available yet.
      </p>
      <div className="max-w-5xl rounded-md border border-border bg-surface">{body}</div>
    </>
  )
}
