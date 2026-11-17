import { UserX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useStudent360 } from '@/lib/api/pending'
import { Student360View } from './Student360View'

export default function Student360Page() {
  const { id = '' } = useParams()
  const query = useStudent360(id)

  if (!query.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: '/f' },
            { label: 'Students', to: '/f/students' },
            { label: 'Student' },
          ]}
          title="Student"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={UserX}
            title="Student not found"
            description="This student does not exist or is not assigned to you. Your assigned students are listed under Students."
            action={
              <Link to="/f/students" className="text-base text-primary hover:underline">
                Back to students
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return <Student360View data={query.data} />
}
