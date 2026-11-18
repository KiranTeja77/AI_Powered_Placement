import type { ColumnDef } from '@tanstack/react-table'
import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { useAuditLog } from '@/lib/api/pending'
import type { AuditEntry } from '@/lib/api/ops-types'
import { formatDateTime } from '@/lib/format'

const ALL = 'all'

const COLUMNS: ColumnDef<AuditEntry, unknown>[] = [
  { accessorKey: 'at', header: 'Time', cell: ({ row }) => formatDateTime(row.original.at) },
  { accessorKey: 'userName', header: 'User' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'target', header: 'Target' },
  {
    accessorKey: 'ip',
    header: 'IP address',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.ip}</span>,
  },
]

export default function AuditPage() {
  const log = useAuditLog()
  const [action, setAction] = useState(ALL)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const actions = [...new Set(log.data.map((e) => e.action))].sort()
  const shown = log.data.filter((e) => {
    const day = e.at.slice(0, 10)
    return (action === ALL || e.action === action) && (!from || day >= from) && (!to || day <= to)
  })

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Audit log' }]}
        title="Audit log"
        description="Who did what, when and from where."
      />
      <div className="mb-3 flex max-w-5xl flex-wrap items-end gap-3">
        <SelectField
          label="Action"
          value={action}
          onChange={setAction}
          options={[
            { value: ALL, label: 'All actions' },
            ...actions.map((a) => ({ value: a, label: a })),
          ]}
          className="grid w-full gap-1.5 sm:w-56"
        />
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="max-w-5xl">
        <DataTable
          columns={COLUMNS}
          data={shown}
          loading={log.isLoading}
          error={log.isError}
          onRetry={log.refetch}
          searchLabel="Search the audit log"
          searchPlaceholder="User or target"
          empty={
            <EmptyState
              icon={ScrollText}
              title="No audit entries yet"
              description="Sign-ins, account changes and other sensitive actions are recorded here with the time and address."
            />
          }
        />
      </div>
    </>
  )
}
