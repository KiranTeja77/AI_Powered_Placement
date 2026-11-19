import { Skeleton } from '@/components/ui/skeleton'

/** Shown for a moment while a role's screens are downloaded for the first time. */
export function PageLoading() {
  return (
    <div role="status" aria-label="Loading" className="max-w-5xl space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
