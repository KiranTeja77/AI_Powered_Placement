import { useState } from 'react'
import { ProctoringReview } from '@/features/faculty/proctoring/ProctoringReview'
import { SignalsNote } from '@/features/faculty/proctoring/ProctoringPage'
import { DevSection } from './DevSection'
import { SAMPLE_ATTEMPTS, SAMPLE_EVENTS } from './facultySamples'

/** Faculty screens that need content to show their layout. Everything here is sample data. */
export function DevFaculty() {
  const [selected, setSelected] = useState<string | null>('a1')
  return (
    <DevSection id="dev-proctoring" title="Proctoring review (sample)">
      <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text">
        Sample data for layout only. It is not shown anywhere in the app.
      </p>
      <SignalsNote />
      <ProctoringReview
        attempts={SAMPLE_ATTEMPTS}
        selectedId={selected}
        onSelect={setSelected}
        events={SAMPLE_EVENTS}
      />
    </DevSection>
  )
}
