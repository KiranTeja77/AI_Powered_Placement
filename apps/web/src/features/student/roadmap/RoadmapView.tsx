import { Route } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { Priority, WeeklyTask } from '@/lib/api/student-types'
import { formatMinutes } from '../common/format'
import { Section } from '../common/Section'

const PRIORITY: Record<Priority, { label: string; tone: StatusTone }> = {
  high: { label: 'High priority', tone: 'danger' },
  medium: { label: 'Medium priority', tone: 'warning' },
  low: { label: 'Low priority', tone: 'neutral' },
}

interface RoadmapViewProps {
  tasks: WeeklyTask[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  onToggle: (task: WeeklyTask, done: boolean) => void
}

/** One week of tasks. Each row says why the task is there and how long it should take. */
export function RoadmapView({ tasks, loading, error, onRetry, onToggle }: RoadmapViewProps) {
  const done = tasks.filter((t) => t.done).length
  const minutes = tasks.filter((t) => !t.done).reduce((sum, t) => sum + t.estimatedMinutes, 0)

  let body
  if (loading) {
    body = (
      <div role="status" aria-label="Loading plan" className="space-y-px p-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  } else if (error) {
    body = <ErrorState title="Your plan could not be loaded" onRetry={onRetry} />
  } else if (tasks.length === 0) {
    body = (
      <EmptyState
        icon={Route}
        title="No plan for this week"
        description="Tasks appear here once your weekly plan is generated. Each one will say why it is there."
      />
    )
  } else {
    body = (
      <ul className="divide-y divide-border">
        {tasks.map((task) => {
          const priority = PRIORITY[task.priority]
          const id = `task-${task.id}`
          return (
            <li key={task.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                id={id}
                className="mt-1"
                checked={task.done}
                onCheckedChange={(v) => onToggle(task, v === true)}
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={id}
                  className={
                    task.done
                      ? 'text-base font-medium text-text-muted line-through'
                      : 'text-base font-medium text-text'
                  }
                >
                  {task.title}
                </label>
                <p className="mt-0.5 text-sm text-text-muted">
                  <span className="font-medium">Why:</span> {task.reason}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <StatusBadge tone={priority.tone} label={priority.label} />
                <span className="text-sm text-text-muted tabular-nums">
                  {formatMinutes(task.estimatedMinutes)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Section
      title="This week"
      description={
        tasks.length > 0
          ? `${done} of ${tasks.length} done, about ${formatMinutes(minutes)} left`
          : undefined
      }
    >
      {body}
    </Section>
  )
}
