import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardCheck, ClipboardList, History } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAssessments } from '@/lib/api/pending'
import type { Assessment, AssessmentStatus } from '@/lib/api/student-types'
import { formatDateTime, formatMinutes } from '../common/format'

const TABS: {
  status: AssessmentStatus
  label: string
  emptyTitle: string
  emptyText: string
  icon: typeof ClipboardList
  action: string
}[] = [
  {
    status: 'upcoming',
    label: 'Upcoming',
    emptyTitle: 'No upcoming assessments',
    emptyText: 'Assessments scheduled for you appear here with their start time and duration.',
    icon: ClipboardList,
    action: 'Start',
  },
  {
    status: 'in_progress',
    label: 'In progress',
    emptyTitle: 'Nothing in progress',
    emptyText:
      'An assessment you have started but not submitted appears here so you can resume it.',
    icon: History,
    action: 'Resume',
  },
  {
    status: 'completed',
    label: 'Completed',
    emptyTitle: 'No completed assessments',
    emptyText: 'Finished assessments appear here with a link to the result and answer review.',
    icon: ClipboardCheck,
    action: 'View result',
  },
]

function columnsFor(status: AssessmentStatus, action: string): ColumnDef<Assessment, unknown>[] {
  return [
    { accessorKey: 'title', header: 'Assessment' },
    { accessorKey: 'kind', header: 'Type' },
    {
      accessorKey: 'startsAt',
      header: status === 'completed' ? 'Taken' : 'Starts',
      cell: ({ row }) => formatDateTime(row.original.startsAt),
    },
    {
      accessorKey: 'durationMinutes',
      header: 'Duration',
      meta: { numeric: true },
      cell: ({ row }) => formatMinutes(row.original.durationMinutes),
    },
    { accessorKey: 'questionCount', header: 'Questions', meta: { numeric: true } },
    {
      id: 'open',
      header: () => <span className="sr-only">Open</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const a = row.original
        const to =
          status === 'completed' && a.attemptId
            ? `/s/results/${a.attemptId}`
            : `/s/assessments/${a.id}/${status === 'in_progress' ? 'take' : 'start'}`
        return (
          <Link to={to} className="text-primary hover:underline">
            {action}
            <span className="sr-only"> {a.title}</span>
          </Link>
        )
      },
    },
  ]
}

export default function AssessmentsPage() {
  const assessments = useAssessments()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const current = TABS.find((t) => t.status === requested)?.status ?? 'upcoming'

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Assessments' }]}
        title="Assessments"
        description="Timed tests set by your faculty and the placement team."
      />
      <Tabs
        value={current}
        onValueChange={(tab) => setParams(tab === 'upcoming' ? {} : { tab }, { replace: true })}
        className="max-w-5xl"
      >
        <TabsList aria-label="Assessment status">
          {TABS.map((t) => (
            <TabsTrigger key={t.status} value={t.status}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.status} value={t.status}>
            <DataTable
              columns={columnsFor(t.status, t.action)}
              data={assessments.data.filter((a) => a.status === t.status)}
              loading={assessments.isLoading}
              error={assessments.isError}
              onRetry={assessments.refetch}
              searchLabel={`Search ${t.label.toLowerCase()} assessments`}
              empty={<EmptyState icon={t.icon} title={t.emptyTitle} description={t.emptyText} />}
            />
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
