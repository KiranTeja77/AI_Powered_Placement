import { Eye, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Always visible during a test: says that monitoring exists and what its alerts mean. */
export function MonitoringBanner() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text"
    >
      <Eye className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
      <span>
        This assessment may be monitored. Alerts are for review, not proof, and a person makes any
        decision.
      </span>
    </p>
  )
}

/** Shown when the student leaves full screen during a test. */
export function FullscreenWarning({ onReturn }: { onReturn: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-surface px-3 py-2 text-base text-text"
    >
      <span>
        <span className="font-medium text-warning">You left full screen.</span> This may be flagged
        for review. Return to full screen to continue.
      </span>
      <Button size="sm" onClick={onReturn}>
        <Maximize /> Return to full screen
      </Button>
    </div>
  )
}
