import { FileQuestion } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssessment, useAssessmentQuestions } from '@/lib/api/pending'
import { notifyUnavailable } from '../common/notify'
import { TestPlayer } from './TestPlayer'

export default function TakePage() {
  const { id = '' } = useParams()
  const assessment = useAssessment(id)
  const questions = useAssessmentQuestions(id)

  if (questions.isLoading || assessment.isLoading) {
    return (
      <div role="status" aria-label="Loading assessment" className="max-w-5xl space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (questions.isError || assessment.isError) {
    return (
      <div className="max-w-3xl rounded-md border border-border bg-surface">
        <ErrorState
          title="This assessment could not be loaded"
          onRetry={() => {
            questions.refetch()
            assessment.refetch()
          }}
        />
      </div>
    )
  }
  if (questions.data.length === 0 || !assessment.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/s' },
            { label: 'Assessments', to: '/s/assessments' },
            { label: 'Assessment' },
          ]}
          title="Assessment"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileQuestion}
            title="This assessment has no questions yet"
            description="Questions appear here once your faculty publishes them. Nothing was started."
            action={
              <Link to="/s/assessments" className="text-base text-primary hover:underline">
                Back to assessments
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return (
    <TestPlayer
      title={assessment.data.title}
      durationSeconds={assessment.data.durationMinutes * 60}
      questions={questions.data}
      expectFullscreen
      onSubmit={notifyUnavailable}
    />
  )
}
