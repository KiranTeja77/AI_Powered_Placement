import { StatusBadge } from '@/components/StatusBadge'
import type { Priority, Suggestion } from '@/lib/api/resume-types'
import { PRIORITY } from './labels'

/** Suggestions in the order the analyzer ranked them, each with the reason it was given. */
export function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <section aria-labelledby="suggestions-heading" className="space-y-3">
      <div>
        <h2 id="suggestions-heading" className="text-md font-semibold text-text">
          Suggestions
        </h2>
        <p className="text-base text-text-muted">
          Each suggestion comes from a fixed rule, and the reason says which one applied.
        </p>
      </div>
      {suggestions.length === 0 ? (
        <p className="max-w-4xl rounded-md border border-border bg-surface px-4 py-6 text-base text-text-muted">
          No suggestions. Nothing in this resume triggered a rule.
        </p>
      ) : (
        <ul className="max-w-4xl divide-y divide-border rounded-md border border-border bg-surface">
          {suggestions.map((s) => {
            const priority = PRIORITY[s.priority as Priority]
            return (
              <li key={s.id} className="space-y-1 px-4 py-3">
                <StatusBadge tone={priority.tone} label={priority.label} />
                <p className="text-base font-medium text-text">{s.message}</p>
                <p className="text-base text-text-muted">
                  <span className="font-medium">Reason: </span>
                  {s.reason}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
