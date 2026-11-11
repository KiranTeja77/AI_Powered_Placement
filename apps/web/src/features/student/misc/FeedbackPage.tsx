import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeedback } from '@/lib/api/pending'
import { formatDate } from '../common/format'
import { Section } from '../common/Section'

export default function FeedbackPage() {
  const feedback = useFeedback()

  let body
  if (feedback.isLoading) {
    body = (
      <div role="status" aria-label="Loading feedback" className="space-y-px p-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  } else if (feedback.isError) {
    body = <ErrorState title="Feedback could not be loaded" onRetry={feedback.refetch} />
  } else if (feedback.data.length === 0) {
    body = (
      <EmptyState
        icon={MessageSquare}
        title="No feedback yet"
        description="Notes from your faculty mentor appear here, newest first, with the date they were written."
      />
    )
  } else {
    body = (
      <ul className="divide-y divide-border">
        {feedback.data.map((note) => (
          <li key={note.id} className="space-y-1 px-4 py-3">
            <p className="text-sm text-text-muted">
              {note.from}, {formatDate(note.at)}
            </p>
            <p className="text-base text-text">{note.message}</p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Feedback' }]}
        title="Feedback"
        description="Guidance from the faculty member assigned to mentor you."
      />
      <div className="max-w-4xl">
        <Section title="From your mentor">{body}</Section>
      </div>
    </>
  )
}
