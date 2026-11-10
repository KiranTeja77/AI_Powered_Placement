import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  /** Short, e.g. "No assessments yet". */
  title: string
  /** One plain sentence on what will appear here. */
  description: string
  /** Only pass an action when the user can act now. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-2 px-4 py-10 sm:items-center sm:text-center',
        className,
      )}
    >
      <Icon className="size-5 text-text-muted" aria-hidden="true" />
      <p className="text-base font-medium text-text">{title}</p>
      <p className="max-w-md text-base text-text-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
