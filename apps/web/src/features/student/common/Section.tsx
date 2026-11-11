import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A heading with a bordered body. The shared shape of every list-like block on the student pages. */
export function Section({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn('rounded-md border border-border bg-surface', bodyClassName)}>
        {children}
      </div>
    </section>
  )
}
