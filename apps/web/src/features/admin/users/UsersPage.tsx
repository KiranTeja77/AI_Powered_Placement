import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@/features/auth/auth-context'
import type { AdminUser } from '@/lib/api/admin-types'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { describeError } from '@/lib/api/errors'
import { useAdminUsers, useResendInvite } from '../queries'
import { CreateUserDialog } from './CreateUserDialog'
import { ROLE_LABEL } from './schemas'
import { StatusDialog } from './StatusDialog'
import { UsersTable } from './UsersTable'

const ALL = 'all'
const ROLES = [
  { value: ALL, label: 'All roles' },
  ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })),
]
const STATUSES = [
  { value: ALL, label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]
const PAGE_SIZE = 20

export default function UsersPage() {
  const me = useCurrentUser()
  const departments = useDepartmentOptions()
  const [role, setRole] = useState(ALL)
  const [departmentId, setDepartmentId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [toggling, setToggling] = useState<AdminUser | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const resend = useResendInvite()

  const sendInvite = async (user: AdminUser) => {
    setResendingId(user.id)
    try {
      await resend.mutateAsync(user.id)
      toast(`A new set-password link was emailed to ${user.email}. The old link no longer works.`)
    } catch (error) {
      toast.error(`The invite could not be sent. ${describeError(error)}`)
    } finally {
      setResendingId(null)
    }
  }

  // Wait for the typing to pause before asking the server, and go back to the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const users = useAdminUsers({
    page,
    size: PAGE_SIZE,
    role: role === ALL ? '' : role,
    departmentId: departmentId === ALL ? '' : departmentId,
    status: status === ALL ? '' : status,
    q,
  })
  const filtered = role !== ALL || departmentId !== ALL || status !== ALL || q.trim() !== ''
  const change = (set: (v: string) => void) => (v: string) => {
    set(v)
    setPage(0)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Users' }]}
        title="Users"
        description="Every account, with the role and status of each."
        action={<CreateUserDialog />}
      />
      <div className="max-w-6xl rounded-md border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <Input
              aria-label="Search users"
              placeholder="Name, email or roll no"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <SelectField
            label="Role"
            hideLabel
            value={role}
            onChange={change(setRole)}
            options={ROLES}
            className="w-full sm:w-40"
          />
          <SelectField
            label="Department"
            hideLabel
            value={departmentId}
            onChange={change(setDepartmentId)}
            options={[{ value: ALL, label: 'All departments' }, ...departments.options]}
            className="w-full sm:w-52"
          />
          <SelectField
            label="Status"
            hideLabel
            value={status}
            onChange={change(setStatus)}
            options={STATUSES}
            className="w-full sm:w-40"
          />
        </div>
        <UsersTable
          data={users.data}
          loading={users.isLoading}
          error={users.isError}
          onRetry={() => void users.refetch()}
          filtered={filtered}
          selfId={me.id}
          onToggle={setToggling}
          onResend={(u) => void sendInvite(u)}
          resendingId={resendingId}
          onPage={setPage}
        />
      </div>
      <StatusDialog user={toggling} onClose={() => setToggling(null)} />
    </>
  )
}
