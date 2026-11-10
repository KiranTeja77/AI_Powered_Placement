import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-surface-muted transition-colors duration-150 data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-text-muted transition-transform duration-150 data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary-foreground" />
    </SwitchPrimitive.Root>
  )
}
