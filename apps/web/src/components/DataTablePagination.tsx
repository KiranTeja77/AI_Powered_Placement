import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  page: number
  pageCount: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

export function DataTablePagination({
  page,
  pageCount,
  total,
  onPrevious,
  onNext,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
      <p className="text-sm text-text-muted">
        {total} {total === 1 ? 'result' : 'results'}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">
          Page {page + 1} of {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          aria-label="Previous page"
          disabled={page <= 0}
          onClick={onPrevious}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-8"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={onNext}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
