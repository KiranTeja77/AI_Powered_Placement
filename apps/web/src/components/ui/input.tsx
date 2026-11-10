import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const fieldClass =
  'w-full rounded-sm border border-border bg-surface px-3 text-base text-text placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger'

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClass, 'h-9', className)} {...props} />
}
