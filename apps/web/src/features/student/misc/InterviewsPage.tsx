import type { ColumnDef } from '@tanstack/react-table'
import { Video } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { useInterviews } from '@/lib/api/pending'
import type { Interview } from '@/lib/api/student-types'
import { formatDateTime } from '../common/format'

const STATUS: Record<Interview['status'], { label: string; tone: StatusTone }> = {
  scheduled: { label: 'Scheduled', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

const COLUMNS: ColumnDef<Interview, unknown>[] = [
  { accessorKey: 'title', header: 'Interview' },
  { accessorKey: 'kind', header: 'Type' },
  {
    accessorKey: 'scheduledAt',
    header: 'When',
    cell: ({ row }) => formatDateTime(row.original.scheduledAt),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = STATUS[row.original.status]
      return <StatusBadge tone={s.tone} label={s.label} />
    },
  },
]

export default function InterviewsPage() {
  const interviews = useInterviews()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Interviews' }]}
        title="Interviews"
        description="Mock and campus interviews you are scheduled for."
      />
      <div className="max-w-5xl">
        <DataTable
          columns={COLUMNS}
          data={interviews.data}
          loading={interviews.isLoading}
          error={interviews.isError}
          onRetry={interviews.refetch}
          searchLabel="Search interviews"
          empty={
            <EmptyState
              icon={Video}
              title="No interviews scheduled"
              description="Interviews appear here with their date, time and type once they are scheduled."
            />
          }
        />
      </div>
    </>
  )
}
