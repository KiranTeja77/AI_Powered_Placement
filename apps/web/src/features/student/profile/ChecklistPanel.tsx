import { Check, Circle } from 'lucide-react'
import { Link } from 'react-router'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Section } from '../common/Section'
import { useProfileChecklist } from './completeness'

/** The checklist behind the profile completeness figure. */
export function ChecklistPanel() {
  const { items, complete, total, loading } = useProfileChecklist()
  return (
    <Section
      title="Profile completeness"
      description={loading ? undefined : `${complete} of ${total} complete`}
    >
      {loading ? (
        <div role="status" aria-label="Loading checklist" className="space-y-2 p-4">
          {items.map((i) => (
            <Skeleton key={i.id} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="px-4 pt-4">
            <Progress
              value={(complete / total) * 100}
              aria-label={`Profile completeness, ${complete} of ${total}`}
            />
          </div>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                {item.done ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-text">
                    {item.label}
                    <span className="sr-only">{item.done ? ', complete' : ', not complete'}</span>
                  </p>
                  <p className="text-sm text-text-muted">{item.detail}</p>
                </div>
                {!item.done && item.to && (
                  <Link to={item.to} className="text-base text-primary hover:underline">
                    Complete
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}
