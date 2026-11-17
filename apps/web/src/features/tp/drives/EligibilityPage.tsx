import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useDriveEligibility } from '@/lib/api/pending'
import { EligibilityView } from './EligibilityView'

export default function EligibilityPage() {
  const { id = '' } = useParams()
  const report = useDriveEligibility(id)
  if (!report.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/tp' },
            { label: 'Drives', to: '/tp/drives' },
            { label: 'Eligibility' },
          ]}
          title="Eligibility"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="No eligibility report"
            description="Once this drive exists, each student appears here with met, not met or unknown for every criterion."
            action={
              <Link to="/tp/drives" className="text-base text-primary hover:underline">
                Back to drives
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return <EligibilityView report={report.data} />
}
