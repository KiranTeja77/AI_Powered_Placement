import { FileX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, describeError } from '@/lib/api/errors'
import type { AnalysisDetail } from '@/lib/api/resume-types'
import { EditBar } from './EditBar'
import { FoundFacts } from './FoundFacts'
import { formatDateTime, formatPercent } from './format'
import { ReadinessPanel } from './ReadinessPanel'
import { SkillsPanel } from './SkillsPanel'
import { SuggestionsPanel } from './SuggestionsPanel'
import { useAnalysis, useUpdateSkills } from './queries'
import { useSkillEdits } from './useSkillEdits'

const UNAVAILABLE =
  'Resume analysis is temporarily unavailable. Your changes are still here, so try saving again in a moment.'
const CRUMBS = [
  { label: 'Home', to: '/s' },
  { label: 'Resume analyzer', to: '/s/resume' },
]

function AnalysisSkeleton() {
  return (
    <div role="status" aria-label="Loading analysis" className="max-w-4xl space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/** The analysis and the controls to correct it. Remounted after each save so its state is fresh. */
function AnalysisView({ detail }: { detail: AnalysisDetail }) {
  const editing = useSkillEdits(detail)
  const update = useUpdateSkills(detail.id)
  const [error, setError] = useState<string | null>(null)
  const edited = detail.edits !== null

  const save = async (payload = editing.payload) => {
    setError(null)
    try {
      const saved = await update.mutateAsync(payload)
      const top = [...saved.effective.roles].sort((a, b) => b.score - a.score)[0]
      toast(
        top ? `Changes saved. ${top.name} is now ${formatPercent(top.score)}.` : 'Changes saved.',
      )
    } catch (e) {
      setError(e instanceof ApiError && e.status === 503 ? UNAVAILABLE : describeError(e))
    }
  }

  const { result } = detail
  return (
    <>
      <PageHeader
        breadcrumbs={[...CRUMBS, { label: 'Analysis' }]}
        title="Resume analysis"
        description={`Analyzed ${formatDateTime(detail.createdAt)}, ${result.textLength.toLocaleString('en-US')} characters, analyzer version ${result.engineVersion}.`}
      />
      <div className="space-y-8 pb-4">
        <ReadinessPanel roles={detail.effective.roles} edited={edited} />
        <div className="space-y-3">
          <SuggestionsPanel suggestions={result.suggestions} />
          {edited && (
            <p className="max-w-4xl text-sm text-text-muted">
              Suggestions follow the analyzer&apos;s original reading, not your changes.
            </p>
          )}
        </div>
        <SkillsPanel skills={result.skills} editing={editing} />
        <FoundFacts fields={result.fields} sections={result.sections} />
      </div>
      <EditBar
        dirty={editing.dirty}
        hasSavedEdits={editing.hasSavedEdits}
        saving={update.isPending}
        error={error}
        onSave={() => void save()}
        onDiscard={() => {
          setError(null)
          editing.discard()
        }}
        onReset={() => void save({ confirmedSkillIds: [], removedSkillIds: [], addedSkillIds: [] })}
      />
    </>
  )
}

export default function AnalysisPage() {
  const { id = '' } = useParams()
  const query = useAnalysis(id)

  if (query.isLoading) {
    return (
      <>
        <PageHeader breadcrumbs={[...CRUMBS, { label: 'Analysis' }]} title="Resume analysis" />
        <AnalysisSkeleton />
      </>
    )
  }

  const missing = query.error instanceof ApiError && [403, 404].includes(query.error.status)
  if (missing) {
    return (
      <>
        <PageHeader breadcrumbs={[...CRUMBS, { label: 'Analysis' }]} title="Resume analysis" />
        <div className="max-w-4xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="Analysis not found"
            description="It may have been removed, or it belongs to another account."
            action={
              <Button asChild variant="secondary">
                <Link to="/s/resume">Back to the resume analyzer</Link>
              </Button>
            }
          />
        </div>
      </>
    )
  }

  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader breadcrumbs={[...CRUMBS, { label: 'Analysis' }]} title="Resume analysis" />
        <div className="max-w-4xl rounded-md border border-border bg-surface">
          <ErrorState
            title="This analysis could not be loaded"
            message={describeError(query.error)}
            onRetry={() => void query.refetch()}
          />
        </div>
      </>
    )
  }

  return <AnalysisView key={query.data.updatedAt} detail={query.data} />
}
