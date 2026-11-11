import type { ColumnDef } from '@tanstack/react-table'
import { Activity, ChartNoAxesColumn, TrendingDown, TrendingUp } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useTopicProgress } from '@/lib/api/pending'
import type { TopicProgress } from '@/lib/api/student-types'
import { formatDate } from '../common/format'
import { Section } from '../common/Section'

function Trend({ points }: { points: number | null }) {
  if (points === null) return <span className="text-text-muted">First attempt</span>
  if (points === 0) return <span className="text-text-muted">No change</span>
  const up = points > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={up ? 'size-4 text-success' : 'size-4 text-danger'} aria-hidden="true" />
      {up ? 'Up' : 'Down'} {Math.abs(points)} points
    </span>
  )
}

const COLUMNS: ColumnDef<TopicProgress, unknown>[] = [
  { accessorKey: 'topic', header: 'Topic' },
  {
    accessorKey: 'latestPercent',
    header: 'Latest score',
    meta: { numeric: true },
    cell: ({ row }) => `${row.original.latestPercent}%`,
  },
  {
    accessorKey: 'changePoints',
    header: 'Trend',
    cell: ({ row }) => <Trend points={row.original.changePoints} />,
  },
  { accessorKey: 'attempts', header: 'Attempts', meta: { numeric: true } },
  {
    accessorKey: 'lastActivityAt',
    header: 'Last activity',
    cell: ({ row }) => formatDate(row.original.lastActivityAt),
  },
]

export default function ProgressPage() {
  const progress = useTopicProgress()
  // Recent activity is the topics with the latest activity, newest first.
  const recent = [...progress.data]
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Progress' }]}
        title="Progress"
        description="How your scores are changing, topic by topic."
      />
      <div className="max-w-5xl space-y-6">
        <section aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="mb-2 text-base font-semibold text-text">
            Topics
          </h2>
          <DataTable
            columns={COLUMNS}
            data={progress.data}
            loading={progress.isLoading}
            error={progress.isError}
            onRetry={progress.refetch}
            searchLabel="Search topics"
            empty={
              <EmptyState
                icon={ChartNoAxesColumn}
                title="No progress to show yet"
                description="After you complete assessments, each topic appears here with your latest score and how it is changing."
              />
            }
          />
        </section>
        <Section title="Recent activity">
          {recent.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Practice, lessons and assessments you complete are listed here, newest first."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((r) => (
                <li key={r.topic} className="flex justify-between gap-3 px-4 py-3 text-base">
                  <span>{r.topic}</span>
                  <span className="text-text-muted">{formatDate(r.lastActivityAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  )
}
