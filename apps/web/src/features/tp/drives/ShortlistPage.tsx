import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useDriveShortlist } from '@/lib/api/pending'
import { ShortlistView } from './ShortlistView'

export default function ShortlistPage() {
  const { id = '' } = useParams()
  const report = useDriveShortlist(id)
  if (!report.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/tp' },
            { label: 'Drives', to: '/tp/drives' },
            { label: 'Shortlist' },
          ]}
          title="Shortlist"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="No shortlist to show"
            description="Once this drive exists, eligible students appear here with their consent status."
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
  return <ShortlistView report={report.data} />
}
