import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const dot: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
  neutral: 'bg-text-muted',
}

interface StatusBadgeProps {
  tone: StatusTone
  /** Sentence-case label. Status is never conveyed by colour alone. */
  label: string
  className?: string
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot[tone])} />
      {label}
    </span>
  )
}
