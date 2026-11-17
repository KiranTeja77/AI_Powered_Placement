import { Check, ChevronDown, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { Option } from '@/components/SelectField'
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
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface MultiSelectProps {
  label: string
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  /** Shown on the button when nothing is chosen. */
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  loading?: boolean
}

/** A searchable multi-select with the chosen items shown as removable tags. */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'None selected',
  error,
  hint,
  disabled,
  loading,
}: MultiSelectProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="secondary"
            disabled={disabled || loading}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={cn('w-full justify-between font-normal', error && 'border-danger')}
          >
            <span className={cn(value.length === 0 && 'text-text-muted')}>
              {loading ? 'Loading' : value.length === 0 ? placeholder : `${value.length} selected`}
            </span>
            <ChevronDown className="text-text-muted" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label}`}
            />
            <CommandList>
              <CommandEmpty>Nothing matches your search.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const selected = value.includes(o.value)
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() => toggle(o.value)}
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
                      {o.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <ul aria-label={`Selected ${label.toLowerCase()}`} className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <li key={v}>
              <Badge variant="primary" className="gap-1 pr-1">
                {labelOf(v)}
                <button
                  type="button"
                  aria-label={`Remove ${labelOf(v)}`}
                  className="rounded-sm p-0.5 hover:bg-surface"
                  onClick={() => toggle(v)}
                  disabled={disabled}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
