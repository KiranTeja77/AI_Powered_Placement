import { Info } from 'lucide-react'
import { useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { useRecruiterCandidates, useRecruiterDrive } from '@/lib/api/pending'
import { formatDate } from '@/lib/format'
import { CandidatesTable } from './CandidatesTable'

export default function RecruiterDrivePage() {
  const { id = '' } = useParams()
  const drive = useRecruiterDrive(id)
  const candidates = useRecruiterCandidates(id)
  const d = drive.data

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/r' },
          { label: 'Drives', to: '/r/drives' },
          { label: d ? d.company : 'Drive' },
        ]}
        title={d ? `${d.company}, ${d.role}` : 'Drive'}
        description={
          d
            ? `Drive date ${formatDate(d.driveDate)}. Move candidates through your stages.`
            : 'The details of the drive appear here once it is assigned to you.'
        }
      />
      <p
        role="note"
        className="mb-4 flex max-w-5xl items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-base text-text"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
        Only profiles the placement team has approved, and whose owners agreed to share them, appear
        here.
      </p>
      <div className="max-w-6xl">
        <CandidatesTable
          candidates={candidates.data}
          stages={d?.stages ?? []}
          loading={candidates.isLoading}
          error={candidates.isError}
          onRetry={candidates.refetch}
        />
      </div>
    </>
  )
}
