import { Check, CircleHelp, X } from 'lucide-react'
import type { CriterionResult } from '@/lib/api/tp-types'
import { cn } from '@/lib/utils'

const STYLE: Record<CriterionResult, { label: string; icon: typeof Check; className: string }> = {
  met: {
    label: 'Met',
    icon: Check,
    className: 'border-solid border-success text-success',
  },
  not_met: {
    label: 'Not met',
    icon: X,
    className: 'border-solid border-danger bg-danger/10 text-danger',
  },
  // Unknown is a lack of information, not a failure. It has its own icon, a dashed outline and
  // no fill, so it cannot be mistaken for "not met" by colour, shape or word.
  unknown: {
    label: 'Unknown',
    icon: CircleHelp,
    className: 'border-dashed border-warning text-warning',
  },
}

/** Met, not met or unknown for one criterion. Always an icon and a word, never colour alone. */
export function CriterionBadge({ result }: { result: CriterionResult }) {
  const { label, icon: Icon, className } = STYLE[result]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  )
}
