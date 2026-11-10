import { ChartNoAxesColumn } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartCardProps {
  title: string
  description?: string
  /** Number of data points. With none, the empty state replaces the chart entirely. */
  dataCount: number
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  height?: number
  children: ReactNode
}

export function ChartCard({
  title,
  description,
  dataCount,
  loading,
  error,
  onRetry,
  emptyTitle = 'No data yet',
  emptyDescription = 'This chart appears once there are records to plot.',
  height = 240,
  children,
}: ChartCardProps) {
  let body: ReactNode
  if (loading) body = <Skeleton className="w-full" style={{ height }} />
  else if (error) body = <ErrorState onRetry={onRetry} />
  else if (dataCount === 0)
    body = <EmptyState icon={ChartNoAxesColumn} title={emptyTitle} description={emptyDescription} />
  else body = <div style={{ height }}>{children}</div>

  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      <div className="p-4">{body}</div>
    </section>
  )
}
