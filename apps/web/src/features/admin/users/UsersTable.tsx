import { Users } from 'lucide-react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AdminUser, AdminUserPage } from '@/lib/api/admin-types'
import { formatDateTime } from '@/lib/format'
import { ROLE_LABEL } from './schemas'

interface UsersTableProps {
  data: AdminUserPage | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  filtered: boolean
  selfId: string
  onToggle: (user: AdminUser) => void
  onPage: (page: number) => void
}

function StatusCell({ user }: { user: AdminUser }) {
  return user.status === 'ACTIVE' ? (
    <StatusBadge tone="success" label="Active" />
  ) : (
    <StatusBadge tone="neutral" label="Inactive" />
  )
}

function ToggleButton({
  user,
  selfId,
  onToggle,
}: {
  user: AdminUser
  selfId: string
  onToggle: (user: AdminUser) => void
}) {
  const self = user.id === selfId
  const active = user.status === 'ACTIVE'
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={self && active}
      title={self && active ? 'You cannot deactivate your own account' : undefined}
      onClick={() => onToggle(user)}
    >
      {active ? 'Deactivate' : 'Activate'}
      <span className="sr-only">
        {' '}
        {user.fullName}
        {self && active ? ', not allowed for your own account' : ''}
      </span>
    </Button>
  )
}

/** The accounts on one page. Paging, filtering and search happen on the server. */
export function UsersTable({
  data,
  loading,
  error,
  onRetry,
  filtered,
  selfId,
  onToggle,
  onPage,
}: UsersTableProps) {
  if (!data && loading) {
    return (
      <div role="status" aria-label="Loading users" className="space-y-px p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  if (error && !data) return <ErrorState title="Users could not be loaded" onRetry={onRetry} />
  if (!data || data.items.length === 0) {
    return filtered ? (
      <p className="px-4 py-10 text-base text-text-muted">No users match these filters.</p>
    ) : (
      <EmptyState
        icon={Users}
        title="No users yet"
        description="Accounts appear here as students register and as you create staff accounts."
      />
    )
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-surface-muted">
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Roll no</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.fullName}
                  <span className="block text-sm text-text-muted">{u.email}</span>
                </TableCell>
                <TableCell>{ROLE_LABEL[u.role] ?? u.role}</TableCell>
                <TableCell>{u.department?.code ?? '—'}</TableCell>
                <TableCell className="font-mono text-sm">{u.rollNo ?? '—'}</TableCell>
                <TableCell>
                  <StatusCell user={u} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <ToggleButton user={u} selfId={selfId} onToggle={onToggle} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y divide-border md:hidden">
        {data.items.map((u) => (
          <li key={u.id} className="space-y-1 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base text-text">{u.fullName}</p>
                <p className="truncate text-sm text-text-muted">{u.email}</p>
              </div>
              <StatusCell user={u} />
            </div>
            <p className="text-sm text-text-muted">
              {ROLE_LABEL[u.role] ?? u.role}
              {u.department ? `, ${u.department.code}` : ''}
              {u.rollNo ? `, ${u.rollNo}` : ''}
            </p>
            <ToggleButton user={u} selfId={selfId} onToggle={onToggle} />
          </li>
        ))}
      </ul>
      <DataTablePagination
        page={data.page}
        pageCount={data.totalPages}
        total={data.totalItems}
        onPrevious={() => onPage(Math.max(0, data.page - 1))}
        onNext={() => onPage(data.page + 1)}
      />
    </>
  )
}
