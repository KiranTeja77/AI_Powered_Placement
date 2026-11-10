import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  label: string
  /** Leave undefined or null when there is no data: an em dash is shown, never a made-up zero. */
  value?: string | number | null
  hint?: string
  loading?: boolean
}

export function StatCard({ label, value, hint, loading }: StatCardProps) {
  const empty = value === undefined || value === null || value === ''
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-sm text-text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <p
          className={
            empty
              ? 'mt-1 text-xl font-semibold text-text-muted'
              : 'mt-1 text-xl font-semibold text-text'
          }
          aria-label={empty ? `${label}: no data` : undefined}
        >
          {empty ? '—' : value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}
