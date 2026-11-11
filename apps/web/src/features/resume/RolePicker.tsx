import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { MAX_ROLES, type RoleDefinition } from '@/lib/api/resume-types'
import { cn } from '@/lib/utils'

interface RolePickerProps {
  id: string
  roles: RoleDefinition[] | undefined
  loading: boolean
  failed: boolean
  onRetry: () => void
  value: string[]
  onChange: (slugs: string[]) => void
  disabled?: boolean
}

/** Multi-select for target roles. With nothing chosen, every role is scored. */
export function RolePicker({
  id,
  roles,
  loading,
  failed,
  onRetry,
  value,
  onChange,
  disabled,
}: RolePickerProps) {
  const [open, setOpen] = useState(false)

  if (loading) return <Skeleton className="h-9 w-full max-w-md" />
  if (failed || !roles) {
    return (
      <div className="rounded-md border border-border">
        <ErrorState
          title="Roles could not be loaded"
          message="You can still analyze your resume against every role, or try loading the list again."
          onRetry={onRetry}
          className="py-4"
        />
      </div>
    )
  }

  const bySlug = new Map(roles.map((r) => [r.slug, r]))
  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug))
    else if (value.length < MAX_ROLES) onChange([...value, slug])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="secondary"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="w-full max-w-md justify-between font-normal"
          >
            <span className={cn(value.length === 0 && 'text-text-muted')}>
              {value.length === 0 ? 'All roles' : `${value.length} selected`}
            </span>
            <ChevronDown className="text-text-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search roles" aria-label="Search roles" />
            <CommandList>
              <CommandEmpty>No roles match your search.</CommandEmpty>
              <CommandGroup>
                {roles.map((role) => {
                  const selected = value.includes(role.slug)
                  return (
                    <CommandItem
                      key={role.slug}
                      value={role.name}
                      onSelect={() => toggle(role.slug)}
                      aria-selected={selected}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-sm border border-border',
                          selected && 'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="flex-1">{role.name}</span>
                      <span className="text-xs text-text-muted">{role.branches.join(', ')}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul aria-label="Selected roles" className="flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <li key={slug}>
              <Badge variant="primary" className="gap-1 pr-1">
                {bySlug.get(slug)?.name ?? slug}
                <button
                  type="button"
                  aria-label={`Remove ${bySlug.get(slug)?.name ?? slug}`}
                  className="rounded-sm p-0.5 hover:bg-surface"
                  onClick={() => toggle(slug)}
                  disabled={disabled}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
