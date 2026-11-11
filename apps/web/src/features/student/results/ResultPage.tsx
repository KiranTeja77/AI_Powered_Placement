import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttemptResult } from '@/lib/api/pending'
import { ResultView } from './ResultView'

export default function ResultPage() {
  const { attemptId = '' } = useParams()
  const result = useAttemptResult(attemptId)

  if (result.isLoading) {
    return (
      <div role="status" aria-label="Loading result" className="max-w-4xl space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (result.isError) {
    return (
      <div className="max-w-3xl rounded-md border border-border bg-surface">
        <ErrorState title="This result could not be loaded" onRetry={result.refetch} />
      </div>
    )
  }
  if (!result.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/s' },
            { label: 'Assessments', to: '/s/assessments' },
            { label: 'Result' },
          ]}
          title="Result"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="No result to show"
            description="Your score, accuracy by topic and answer review appear here after you submit an assessment."
            action={
              <Link to="/s/assessments" className="text-base text-primary hover:underline">
                Go to assessments
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return <ResultView result={result.data} />
}
