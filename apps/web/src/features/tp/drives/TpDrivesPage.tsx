import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useTpDrives } from '@/lib/api/pending'
import type { DriveStatus, TpDriveRow } from '@/lib/api/tp-types'
import { formatDate } from '@/lib/format'

const STATUS: Record<DriveStatus, { label: string; tone: StatusTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  open: { label: 'Open', tone: 'info' },
  closed: { label: 'Closed', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
}
const ALL = 'all'

const COLUMNS: ColumnDef<TpDriveRow, unknown>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'role', header: 'Role' },
  {
    accessorKey: 'driveDate',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.driveDate),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = STATUS[row.original.status]
      return <StatusBadge tone={s.tone} label={s.label} />
    },
  },
  { accessorKey: 'eligibleCount', header: 'Eligible', meta: { numeric: true } },
  { accessorKey: 'shortlistedCount', header: 'Shortlisted', meta: { numeric: true } },
  {
    id: 'open',
    header: () => <span className="sr-only">Open</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex justify-end gap-3 whitespace-nowrap">
        <Link
          to={`/tp/drives/${row.original.id}/eligibility`}
          className="text-primary hover:underline"
        >
          Eligibility<span className="sr-only"> for {row.original.company}</span>
        </Link>
        <Link
          to={`/tp/drives/${row.original.id}/shortlist`}
          className="text-primary hover:underline"
        >
          Shortlist<span className="sr-only"> for {row.original.company}</span>
        </Link>
      </span>
    ),
  },
]

export default function TpDrivesPage() {
  const drives = useTpDrives()
  const [status, setStatus] = useState(ALL)
  const filtered = drives.data.filter((d) => status === ALL || d.status === status)
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/tp' }, { label: 'Drives' }]}
        title="Drives"
        description="Campus recruitment drives, who is eligible and who is shortlisted."
        action={
          <Button asChild>
            <Link to="/tp/drives/new">
              <Plus /> New drive
            </Link>
          </Button>
        }
      />
      <div className="max-w-6xl">
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={drives.isLoading}
          error={drives.isError}
          onRetry={drives.refetch}
          searchLabel="Search drives"
          searchPlaceholder="Company or role"
          filters={
            <SelectField
              label="Status"
              hideLabel
              value={status}
              onChange={setStatus}
              options={[
                { value: ALL, label: 'All statuses' },
                ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
              ]}
              className="w-full sm:w-44"
            />
          }
          empty={
            <EmptyState
              icon={Briefcase}
              title="No drives yet"
              description="Drives you create appear here with how many students are eligible and shortlisted."
              action={
                <Button asChild>
                  <Link to="/tp/drives/new">New drive</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </>
  )
}
