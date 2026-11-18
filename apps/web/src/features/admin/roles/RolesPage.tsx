import { Info, ShieldQuestion } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { usePermissionMatrix } from '@/lib/api/pending'
import { PermissionGrid } from './PermissionGrid'

export default function RolesPage() {
  const matrix = usePermissionMatrix()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Roles and permissions' }]}
        title="Roles and permissions"
        description="What each role can do across the platform."
      />
      <p
        role="note"
        className="mb-4 flex max-w-4xl items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-base text-text"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
        This matrix is read only. Changes to permissions are not available yet.
      </p>
      <div className="max-w-4xl rounded-md border border-border bg-surface">
        {matrix.data ? (
          <PermissionGrid matrix={matrix.data} />
        ) : (
          <EmptyState
            icon={ShieldQuestion}
            title="No permission matrix to show"
            description="Each role and what it may do will be listed here, with a switch per permission."
          />
        )}
      </div>
    </>
  )
}
