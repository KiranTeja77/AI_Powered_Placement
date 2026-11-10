import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  searchLabel?: string
  searchPlaceholder?: string
  /** Select or toggle controls, each with its own label. */
  children?: ReactNode
  onClear?: () => void
  hasActiveFilters?: boolean
}

export function FilterBar({
  search,
  onSearchChange,
  searchLabel = 'Search',
  searchPlaceholder = 'Search',
  children,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <Input
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      {children}
      {onClear && hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X /> Clear filters
        </Button>
      )}
    </div>
  )
}
