import type { ColumnDef } from '@tanstack/react-table'
import { UsersRound } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { SelectField } from '@/components/SelectField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { RecruiterCandidate } from '@/lib/api/ops-types'
import { notifyFeatureUnavailable, notifyUnavailable } from '@/lib/notify'

/** Move one candidate to another stage. Updating is not available yet, and the button says so. */
function StageControl({ candidate, stages }: { candidate: RecruiterCandidate; stages: string[] }) {
  const [stage, setStage] = useState(candidate.stage)
  return (
    <div className="flex items-center gap-2">
      <SelectField
        label={`Stage for ${candidate.name}`}
        hideLabel
        value={stage}
        onChange={setStage}
        options={(stages.length > 0 ? stages : [candidate.stage]).map((s) => ({
          value: s,
          label: s,
        }))}
        className="w-36"
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={stage === candidate.stage}
        onClick={notifyUnavailable}
      >
        Update<span className="sr-only"> stage for {candidate.name}</span>
      </Button>
    </div>
  )
}

interface CandidatesTableProps {
  candidates: RecruiterCandidate[]
  stages: string[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

/** The approved, consented candidates for one drive. */
export function CandidatesTable({
  candidates,
  stages,
  loading,
  error,
  onRetry,
}: CandidatesTableProps) {
  const columns: ColumnDef<RecruiterCandidate, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'department', header: 'Department' },
    {
      accessorKey: 'cgpa',
      header: 'CGPA',
      meta: { numeric: true },
      cell: ({ row }) => (row.original.cgpa === null ? '—' : row.original.cgpa.toFixed(2)),
    },
    {
      id: 'skills',
      header: 'Key skills',
      enableSorting: false,
      cell: ({ row }) => (
        <ul className="flex flex-wrap gap-1">
          {row.original.keySkills.slice(0, 4).map((s) => (
            <li key={s}>
              <Badge variant="neutral">{s}</Badge>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'stage',
      header: 'Stage',
      enableSorting: false,
      cell: ({ row }) => (
        <StageControl
          key={row.original.id + row.original.stage}
          candidate={row.original}
          stages={stages}
        />
      ),
    },
    {
      id: 'resume',
      header: () => <span className="sr-only">Resume</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => notifyFeatureUnavailable('Viewing a resume')}
        >
          View resume<span className="sr-only"> for {row.original.name}</span>
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={candidates}
      loading={loading}
      error={error}
      onRetry={onRetry}
      searchLabel="Search candidates"
      empty={
        <EmptyState
          icon={UsersRound}
          title="No approved candidates yet"
          description="Candidates appear here after the placement team approves a shortlist and they have agreed to share their profile."
        />
      }
    />
  )
}
