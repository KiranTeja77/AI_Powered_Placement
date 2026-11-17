import { Info } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { useProctorEvents, useProctorQueue } from '@/lib/api/pending'
import { ProctoringReview } from './ProctoringReview'

/** The visible reminder that sits on every proctoring screen. */
export function SignalsNote() {
  return (
    <p
      role="note"
      className="mb-4 flex max-w-3xl items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-base text-text"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
      Alerts are signals for review, not proof of misconduct.
    </p>
  )
}

export default function ProctoringPage() {
  const queue = useProctorQueue()
  const [selected, setSelected] = useState<string | null>(null)
  const events = useProctorEvents(selected)
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/f' }, { label: 'Proctoring review' }]}
        title="Proctoring review"
        description="Attempts with monitoring alerts, for a person to look at."
      />
      <SignalsNote />
      <div className="max-w-7xl">
        <ProctoringReview
          attempts={queue.data}
          loading={queue.isLoading}
          error={queue.isError}
          onRetry={queue.refetch}
          selectedId={selected}
          onSelect={setSelected}
          events={events.data}
        />
      </div>
    </>
  )
}
