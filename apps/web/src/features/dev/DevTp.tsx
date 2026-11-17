import { AnalyticsView } from '@/features/tp/analytics/AnalyticsView'
import { EligibilityView } from '@/features/tp/drives/EligibilityView'
import { DevSection } from './DevSection'
import { SAMPLE_ELIGIBILITY, SAMPLE_HEATMAP, SAMPLE_TREND } from './tpSamples'

function SampleNote() {
  return (
    <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text">
      Sample data for layout only. It is not shown anywhere in the app.
    </p>
  )
}

/** T&P screens that need content to show their layout. Everything here is sample data. */
export function DevTp() {
  return (
    <>
      <DevSection id="dev-eligibility" title="Eligibility review (sample)">
        <SampleNote />
        <div className="rounded-md border border-border p-3">
          <EligibilityView report={SAMPLE_ELIGIBILITY} />
        </div>
      </DevSection>
      <DevSection id="dev-analytics" title="Analytics heatmap and trend (sample)">
        <SampleNote />
        <AnalyticsView cells={SAMPLE_HEATMAP} trend={SAMPLE_TREND} />
      </DevSection>
    </>
  )
}
