import type { ColumnDef } from '@tanstack/react-table'
import { ListChecks, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useQuestionBank } from '@/lib/api/pending'
import type { QuestionRow, ReviewStatus } from '@/lib/api/faculty-types'
import { DIFFICULTIES, QUESTION_TYPES } from './schemas'

const ALL = 'all'

const REVIEW: Record<ReviewStatus, { label: string; tone: StatusTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  in_review: { label: 'In review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  retired: { label: 'Retired', tone: 'neutral' },
}

const label = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label ?? value

const QUESTION_COLUMNS: ColumnDef<QuestionRow, unknown>[] = [
  {
    accessorKey: 'text',
    header: 'Question',
    cell: ({ row }) => (
      <Link to={`/f/questions/${row.original.id}`} className="text-primary hover:underline">
        {row.original.text}
      </Link>
    ),
  },
  { accessorKey: 'topic', header: 'Topic' },
  {
    accessorKey: 'difficulty',
    header: 'Difficulty',
    cell: ({ row }) => label(DIFFICULTIES, row.original.difficulty),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => label(QUESTION_TYPES, row.original.type),
  },
  { accessorKey: 'marks', header: 'Marks', meta: { numeric: true } },
  {
    accessorKey: 'status',
    header: 'Review status',
    cell: ({ row }) => {
      const s = REVIEW[row.original.status]
      return <StatusBadge tone={s.tone} label={s.label} />
    },
  },
]

const withAll = (word: string, list: readonly { value: string; label: string }[]) => [
  { value: ALL, label: word },
  ...list,
]

export default function QuestionsPage() {
  const bank = useQuestionBank()
  const [topic, setTopic] = useState(ALL)
  const [difficulty, setDifficulty] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const topics = useMemo(
    () => [...new Set(bank.data.map((q) => q.topic))].sort().map((t) => ({ value: t, label: t })),
    [bank.data],
  )
  const filtered = bank.data.filter(
    (q) =>
      (topic === ALL || q.topic === topic) &&
      (difficulty === ALL || q.difficulty === difficulty) &&
      (type === ALL || q.type === type) &&
      (status === ALL || q.status === status),
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/f' }, { label: 'Question bank' }]}
        title="Question bank"
        description="Questions you can add to assessments, and their review status."
        action={
          <Button asChild>
            <Link to="/f/questions/new">
              <Plus /> New question
            </Link>
          </Button>
        }
      />
      <div className="max-w-6xl">
        <DataTable
          columns={QUESTION_COLUMNS}
          data={filtered}
          loading={bank.isLoading}
          error={bank.isError}
          onRetry={bank.refetch}
          searchLabel="Search questions"
          filters={
            <>
              <SelectField
                label="Topic"
                hideLabel
                value={topic}
                onChange={setTopic}
                options={withAll('All topics', topics)}
                className="w-full sm:w-44"
              />
              <SelectField
                label="Difficulty"
                hideLabel
                value={difficulty}
                onChange={setDifficulty}
                options={withAll('All difficulties', DIFFICULTIES)}
                className="w-full sm:w-44"
              />
              <SelectField
                label="Type"
                hideLabel
                value={type}
                onChange={setType}
                options={withAll('All types', QUESTION_TYPES)}
                className="w-full sm:w-56"
              />
              <SelectField
                label="Review status"
                hideLabel
                value={status}
                onChange={setStatus}
                options={withAll(
                  'All statuses',
                  Object.entries(REVIEW).map(([value, { label }]) => ({ value, label })),
                )}
                className="w-full sm:w-44"
              />
            </>
          }
          empty={
            <EmptyState
              icon={ListChecks}
              title="No questions yet"
              description="Questions you write appear here with their topic, difficulty and review status."
              action={
                <Button asChild>
                  <Link to="/f/questions/new">New question</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </>
  )
}
