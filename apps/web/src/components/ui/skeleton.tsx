import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Static placeholder; no pulsing animation by design. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div aria-hidden="true" className={cn('rounded-sm bg-surface-muted', className)} {...props} />
  )
}
