import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { TrainingGroup } from '@/lib/api/student-types'
import { percent } from '../common/format'
import { Section } from '../common/Section'

interface TrackViewProps {
  groups: TrainingGroup[]
  /** Names the kind of track in the empty state, e.g. "technical". */
  kind: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

/** The catalogue of a track, grouped, with progress per topic. */
export function TrackView({ groups, kind, loading, error, onRetry }: TrackViewProps) {
  const [search, setSearch] = useState('')

  if (loading) {
    return (
      <div role="status" aria-label="Loading training" className="max-w-4xl space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-4xl rounded-md border border-border bg-surface">
        <ErrorState title="Training could not be loaded" onRetry={onRetry} />
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <div className="max-w-4xl rounded-md border border-border bg-surface">
        <EmptyState
          icon={BookOpen}
          title="No training yet"
          description={`Topics for the ${kind} track will appear here, grouped, with your progress in each.`}
        />
      </div>
    )
  }

  const query = search.trim().toLowerCase()
  const shown = groups
    .map((g) => ({
      ...g,
      topics: g.topics.filter((t) => `${g.name} ${t.title}`.toLowerCase().includes(query)),
    }))
    .filter((g) => g.topics.length > 0)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid max-w-sm gap-1.5">
        <Label htmlFor="topic-search">Search topics</Label>
        <Input id="topic-search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {shown.length === 0 && (
        <p className="text-base text-text-muted">No topics match your search.</p>
      )}
      {shown.map((group) => (
        <Section key={group.name} title={group.name}>
          <ul className="divide-y divide-border">
            {group.topics.map((topic) => {
              const done = topic.lessons.filter((l) => l.done).length
              const total = topic.lessons.length
              const next = topic.lessons.find((l) => !l.done) ?? topic.lessons[0]
              return (
                <li
                  key={topic.id}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_200px_auto] sm:items-center"
                >
                  <p className="text-base font-medium text-text">{topic.title}</p>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={percent(done, total)}
                      aria-label={`${topic.title} progress`}
                      className="flex-1"
                    />
                    <span className="text-sm whitespace-nowrap text-text-muted tabular-nums">
                      {done} of {total}
                    </span>
                  </div>
                  {next ? (
                    <Link
                      to={`/s/training/${topic.id}/${next.id}`}
                      className="text-base text-primary hover:underline"
                    >
                      {done === 0 ? 'Start' : done === total ? 'Review' : 'Continue'}
                      <span className="sr-only"> {topic.title}</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-text-muted">No lessons yet</span>
                  )}
                </li>
              )
            })}
          </ul>
        </Section>
      ))}
    </div>
  )
}
