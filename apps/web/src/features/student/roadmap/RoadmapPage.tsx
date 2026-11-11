import { PageHeader } from '@/components/PageHeader'
import { useWeeklyTasks } from '@/lib/api/pending'
import { notifyUnavailable } from '../common/notify'
import { RoadmapView } from './RoadmapView'

export default function RoadmapPage() {
  const tasks = useWeeklyTasks()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Roadmap' }]}
        title="Roadmap"
        description="A weekly plan built from your weak areas and your target roles."
      />
      <div className="max-w-4xl">
        <RoadmapView
          tasks={tasks.data}
          loading={tasks.isLoading}
          error={tasks.isError}
          onRetry={tasks.refetch}
          onToggle={notifyUnavailable}
        />
      </div>
    </>
  )
}
