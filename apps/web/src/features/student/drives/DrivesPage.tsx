import type { ColumnDef } from '@tanstack/react-table'
import { Briefcase } from 'lucide-react'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { useDrives } from '@/lib/api/pending'
import type { DriveRow } from '@/lib/api/student-types'
import { formatDate } from '../common/format'

const ELIGIBILITY: Record<DriveRow['eligibility'], { label: string; tone: StatusTone }> = {
  eligible: { label: 'Eligible', tone: 'success' },
  not_eligible: { label: 'Not eligible', tone: 'danger' },
  unknown: { label: 'Unknown', tone: 'warning' },
}

const COLUMNS: ColumnDef<DriveRow, unknown>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'role', header: 'Role' },
  {
    accessorKey: 'deadline',
    header: 'Apply by',
    cell: ({ row }) => formatDate(row.original.deadline),
  },
  {
    accessorKey: 'eligibility',
    header: 'Eligibility',
    cell: ({ row }) => {
      const e = ELIGIBILITY[row.original.eligibility]
      return <StatusBadge tone={e.tone} label={e.label} />
    },
  },
  {
    id: 'open',
    header: () => <span className="sr-only">Open</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <Link to={`/s/drives/${row.original.id}`} className="text-primary hover:underline">
        View
        <span className="sr-only">
          {' '}
          {row.original.company}, {row.original.role}
        </span>
      </Link>
    ),
  },
]

export default function DrivesPage() {
  const drives = useDrives()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Drives' }]}
        title="Drives"
        description="Campus recruitment drives and whether you meet each one's criteria."
      />
      <div className="max-w-5xl">
        <DataTable
          columns={COLUMNS}
          data={drives.data}
          loading={drives.isLoading}
          error={drives.isError}
          onRetry={drives.refetch}
          searchLabel="Search drives"
          empty={
            <EmptyState
              icon={Briefcase}
              title="No drives yet"
              description="Drives open to your department appear here with your eligibility for each."
            />
          }
        />
      </div>
    </>
  )
}
