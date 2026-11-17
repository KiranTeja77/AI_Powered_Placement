import type { ColumnDef } from '@tanstack/react-table'
import { Trophy } from 'lucide-react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { usePlacements } from '@/lib/api/pending'
import type { PlacementRow } from '@/lib/api/tp-types'

const STAGES: { key: keyof PlacementRow; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interviewed', label: 'Interviewed' },
  { key: 'offered', label: 'Offered' },
]

const COLUMNS: ColumnDef<PlacementRow, unknown>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'role', header: 'Role' },
  ...STAGES.map((s): ColumnDef<PlacementRow, unknown> => ({
    accessorKey: s.key,
    header: s.label,
    meta: { numeric: true },
  })),
]

export default function PlacementsPage() {
  const placements = usePlacements()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/tp' }, { label: 'Placements' }]}
        title="Placements"
        description="How many students reached each stage, drive by drive."
      />
      <p className="mb-3 text-sm text-text-muted">
        Stages in order: applied, shortlisted, interviewed, offered.
      </p>
      <div className="max-w-5xl">
        <DataTable
          columns={COLUMNS}
          data={placements.data}
          loading={placements.isLoading}
          error={placements.isError}
          onRetry={placements.refetch}
          searchLabel="Search placements"
          searchPlaceholder="Company or role"
          empty={
            <EmptyState
              icon={Trophy}
              title="No placements to track yet"
              description="Each drive appears here with how many students applied, were shortlisted, interviewed and offered."
            />
          }
        />
      </div>
    </>
  )
}
