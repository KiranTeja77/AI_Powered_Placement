import type { ColumnDef } from '@tanstack/react-table'
import { ShieldCheck } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import type { ProctorAttempt, ProctorEvent } from '@/lib/api/faculty-types'
import { ReviewPanel } from './ReviewPanel'

interface ProctoringReviewProps {
  attempts: ProctorAttempt[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  events: ProctorEvent[]
}

/** The review queue beside the detail of the selected attempt. */
export function ProctoringReview({
  attempts,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  events,
}: ProctoringReviewProps) {
  const columns: ColumnDef<ProctorAttempt, unknown>[] = [
    { accessorKey: 'studentName', header: 'Student' },
    {
      accessorKey: 'rollNo',
      header: 'Roll no',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.rollNo}</span>,
    },
    { accessorKey: 'assessmentTitle', header: 'Assessment' },
    { accessorKey: 'eventCount', header: 'Events', meta: { numeric: true } },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.status === 'pending' ? (
          <StatusBadge tone="warning" label="Needs review" />
        ) : (
          <StatusBadge tone="success" label="Reviewed" />
        ),
    },
    {
      id: 'open',
      header: () => <span className="sr-only">Review</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant={row.original.id === selectedId ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={row.original.id === selectedId}
          onClick={() => onSelect(row.original.id)}
        >
          Review<span className="sr-only"> {row.original.studentName}</span>
        </Button>
      ),
    },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <DataTable
        columns={columns}
        data={attempts}
        loading={loading}
        error={error}
        onRetry={onRetry}
        searchLabel="Search attempts"
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="Nothing to review"
            description="Attempts with monitoring alerts appear here for you to review."
          />
        }
      />
      <ReviewPanel attempt={attempts.find((a) => a.id === selectedId) ?? null} events={events} />
    </div>
  )
}
