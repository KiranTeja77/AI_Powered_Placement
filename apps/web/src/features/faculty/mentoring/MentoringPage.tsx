import type { ColumnDef } from '@tanstack/react-table'
import { NotebookPen } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useMentoringNotes } from '@/lib/api/pending'
import type { MentoringNote } from '@/lib/api/faculty-types'
import { formatDate } from '@/lib/format'
import { AddNoteDialog } from './AddNoteDialog'

const COLUMNS: ColumnDef<MentoringNote, unknown>[] = [
  { accessorKey: 'at', header: 'Date', cell: ({ row }) => formatDate(row.original.at) },
  { accessorKey: 'studentName', header: 'Student' },
  { accessorKey: 'note', header: 'Note' },
  {
    accessorKey: 'assignedPractice',
    header: 'Assigned practice',
    cell: ({ row }) => row.original.assignedPractice ?? '—',
  },
  {
    accessorKey: 'followUpOn',
    header: 'Follow-up',
    cell: ({ row }) => (row.original.followUpOn ? formatDate(row.original.followUpOn) : '—'),
  },
]

export default function MentoringPage() {
  const notes = useMentoringNotes()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/f' }, { label: 'Mentoring' }]}
        title="Mentoring"
        description="Your notes, the practice you assigned and when to follow up."
        action={<AddNoteDialog />}
      />
      <div className="max-w-6xl">
        <DataTable
          columns={COLUMNS}
          data={notes.data}
          loading={notes.isLoading}
          error={notes.isError}
          onRetry={notes.refetch}
          searchLabel="Search notes"
          empty={
            <EmptyState
              icon={NotebookPen}
              title="No mentoring notes yet"
              description="Notes you write after meeting a student appear here with any practice you assigned and the follow-up date."
            />
          }
        />
      </div>
    </>
  )
}
