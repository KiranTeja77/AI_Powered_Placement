import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-md bg-surface text-text',
        className,
      )}
      {...props}
    />
  )
}

export function CommandInput({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3">
      <Search className="size-4 shrink-0 text-text-muted" />
      <CommandPrimitive.Input
        className={cn(
          'h-full w-full bg-transparent text-base text-text outline-none placeholder:text-text-muted',
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List className={cn('max-h-72 overflow-y-auto p-1', className)} {...props} />
  )
}

export function CommandEmpty(props: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty className="py-6 text-center text-base text-text-muted" {...props} />
  )
}

export function CommandGroup({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'text-text [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-muted',
        className,
      )}
      {...props}
    />
  )
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-base select-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-text-muted',
        className,
      )}
      {...props}
    />
  )
}
