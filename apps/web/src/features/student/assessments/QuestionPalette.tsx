import { Check, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionPaletteProps {
  ids: string[]
  current: number
  answered: ReadonlySet<string>
  flagged: ReadonlySet<string>
  onGo: (index: number) => void
}

function describe(n: number, isAnswered: boolean, isFlagged: boolean, isCurrent: boolean) {
  return [
    `Question ${n}`,
    isAnswered ? 'answered' : 'not answered',
    isFlagged && 'marked for review',
    isCurrent && 'current',
  ]
    .filter(Boolean)
    .join(', ')
}

/** Numbered buttons for jumping between questions. State is shown by icon and label, not colour. */
export function QuestionPalette({ ids, current, answered, flagged, onGo }: QuestionPaletteProps) {
  return (
    <nav aria-label="Question palette" className="space-y-3">
      <ol className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
        {ids.map((id, i) => {
          const isAnswered = answered.has(id)
          const isFlagged = flagged.has(id)
          const isCurrent = i === current
          return (
            <li key={id}>
              <button
                type="button"
                aria-label={describe(i + 1, isAnswered, isFlagged, isCurrent)}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onGo(i)}
                className={cn(
                  'relative flex h-9 w-full items-center justify-center rounded-sm border text-sm font-medium tabular-nums',
                  isAnswered
                    ? 'border-primary bg-primary-subtle text-text'
                    : 'border-border bg-surface text-text',
                  isCurrent && 'ring-2 ring-primary',
                )}
              >
                {i + 1}
                {isFlagged && (
                  <Flag
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 size-3.5 fill-warning text-warning"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ol>
      <ul className="space-y-1 text-sm text-text-muted">
        <li className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-sm border border-primary bg-primary-subtle">
            <Check className="size-3" aria-hidden="true" />
          </span>
          Answered
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-sm border border-border bg-surface">
            <Flag className="size-3 fill-warning text-warning" aria-hidden="true" />
          </span>
          Marked for review
        </li>
        <li className="flex items-center gap-2">
          <span className="size-5 rounded-sm border border-border bg-surface" aria-hidden="true" />
          Not answered
        </li>
      </ul>
    </nav>
  )
}
