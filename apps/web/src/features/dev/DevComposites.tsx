import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTabs } from '@/components/SectionTabs'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { DevRow, DevSection } from './DevSection'

interface SampleRow {
  name: string
  status: 'Passed' | 'Needs review' | 'Missing'
  count: number
}

// Clearly labelled layout sample. It exists only on this dev route.
const sampleRows: SampleRow[] = Array.from({ length: 12 }, (_, i) => ({
  name: `Sample item ${i + 1}`,
  status: (['Passed', 'Needs review', 'Missing'] as const)[i % 3] ?? 'Passed',
  count: (i + 1) * 3,
}))

const tone = { Passed: 'success', 'Needs review': 'warning', Missing: 'danger' } as const

const columns: ColumnDef<SampleRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge tone={tone[row.original.status]} label={row.original.status} />,
  },
  { accessorKey: 'count', header: 'Count', meta: { numeric: true } },
]

const empty = (
  <EmptyState
    icon={ClipboardList}
    title="No assessments yet"
    description="Assessments assigned to you will appear here."
  />
)

export function DevComposites() {
  const [retries, setRetries] = useState(0)
  return (
    <>
      <DevSection id="status" title="Status badge and stat card">
        <DevRow label="StatusBadge: dot plus label">
          <StatusBadge tone="success" label="Eligible" />
          <StatusBadge tone="warning" label="Needs review" />
          <StatusBadge tone="danger" label="Not eligible" />
          <StatusBadge tone="info" label="In progress" />
          <StatusBadge tone="neutral" label="Unknown" />
        </DevRow>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="No value" />
          <StatCard label="Loading" loading />
          <StatCard label="With value (sample)" value={42} hint="Layout sample" />
        </div>
      </DevSection>

      <DevSection id="states" title="Empty, error and chart states">
        <div className="rounded-md border border-border bg-surface">{empty}</div>
        <div className="rounded-md border border-border bg-surface">
          <ErrorState onRetry={() => setRetries((n) => n + 1)} />
        </div>
        <p className="text-sm text-text-muted">Retry pressed {retries} times</p>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard title="Chart with no data" dataCount={0}>
            <div />
          </ChartCard>
          <ChartCard title="Chart loading" dataCount={0} loading>
            <div />
          </ChartCard>
        </div>
      </DevSection>

      <DevSection id="table" title="Data table">
        <DevRow label="Loading">
          <div className="w-full">
            <DataTable columns={columns} data={[]} loading empty={empty} />
          </div>
        </DevRow>
        <DevRow label="Empty">
          <div className="w-full">
            <DataTable columns={columns} data={[]} empty={empty} />
          </div>
        </DevRow>
        <DevRow label="Error">
          <div className="w-full">
            <DataTable columns={columns} data={[]} error empty={empty} onRetry={() => undefined} />
          </div>
        </DevRow>
        <DevRow label="Rows (sample data for layout only): sort, filter, paginate">
          <div className="w-full">
            <DataTable
              columns={columns}
              data={sampleRows}
              empty={empty}
              pageSize={5}
              searchLabel="Search items"
              searchPlaceholder="Search items"
            />
          </div>
        </DevRow>
      </DevSection>

      <DevSection id="header" title="Page header and section tabs">
        <PageHeader
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Assessments' }]}
          title="Assessments"
          description="Tests assigned to you and your past attempts."
          action={<Button>Start assessment</Button>}
        />
        <SectionTabs
          label="Example section"
          tabs={[
            { to: '/dev/components', label: 'Overview', end: true },
            { to: '/dev/other', label: 'History' },
          ]}
        />
      </DevSection>
    </>
  )
}
