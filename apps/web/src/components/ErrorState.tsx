import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'The data could not be loaded. Try again in a moment.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 px-4 py-10 sm:items-center sm:text-center',
        className,
      )}
    >
      <TriangleAlert className="size-5 text-danger" aria-hidden="true" />
      <p className="text-base font-medium text-text">{title}</p>
      <p className="max-w-md text-base text-text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
