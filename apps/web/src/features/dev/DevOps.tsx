import { PermissionGrid } from '@/features/admin/roles/PermissionGrid'
import { CandidatesTable } from '@/features/recruiter/CandidatesTable'
import { DevSection } from './DevSection'
import { SAMPLE_CANDIDATES, SAMPLE_MATRIX, SAMPLE_STAGES } from './opsSamples'

function SampleNote() {
  return (
    <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text">
      Sample data for layout only. It is not shown anywhere in the app.
    </p>
  )
}

/** Admin and recruiter tables that need content to show their layout. Everything here is sample data. */
export function DevOps() {
  return (
    <>
      <DevSection id="dev-permissions" title="Permission matrix (sample)">
        <SampleNote />
        <div className="rounded-md border border-border bg-surface">
          <PermissionGrid matrix={SAMPLE_MATRIX} />
        </div>
      </DevSection>
      <DevSection id="dev-candidates" title="Recruiter candidates (sample)">
        <SampleNote />
        <CandidatesTable candidates={SAMPLE_CANDIDATES} stages={SAMPLE_STAGES} />
      </DevSection>
    </>
  )
}
