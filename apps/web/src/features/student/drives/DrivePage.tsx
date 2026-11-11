import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrive } from '@/lib/api/pending'
import { DriveDetailView } from './DriveDetailView'

export default function DrivePage() {
  const { id = '' } = useParams()
  const drive = useDrive(id)

  if (drive.isLoading) {
    return (
      <div role="status" aria-label="Loading drive" className="max-w-4xl space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (drive.isError) {
    return (
      <div className="max-w-3xl rounded-md border border-border bg-surface">
        <ErrorState title="This drive could not be loaded" onRetry={drive.refetch} />
      </div>
    )
  }
  if (!drive.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/s' },
            { label: 'Drives', to: '/s/drives' },
            { label: 'Drive' },
          ]}
          title="Drive"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="Drive not found"
            description="This drive does not exist or is not open to you. Drives open to your department are listed under Drives."
            action={
              <Link to="/s/drives" className="text-base text-primary hover:underline">
                Back to drives
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return <DriveDetailView drive={drive.data} />
}
