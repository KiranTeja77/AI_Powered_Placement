import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useLesson } from '@/lib/api/pending'
import { LessonView } from './LessonView'

export default function LessonPage() {
  const { topic = '', lesson = '' } = useParams()
  const query = useLesson(topic, lesson)

  if (!query.data) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Training' }, { label: 'Lesson' }]}
          title="Lesson"
        />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="This lesson is not available yet"
            description="Lessons appear here with their reading and practice questions once training content is published."
            action={
              <Link to="/s/training/technical" className="text-base text-primary hover:underline">
                Back to technical training
              </Link>
            }
          />
        </div>
      </>
    )
  }
  return <LessonView lesson={query.data} trackPath="/s/training/technical" />
}
