import { ChartNoAxesColumn } from 'lucide-react'
import { ChartCard } from '@/components/ChartCard'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Section } from '@/components/Section'
import { Skeleton } from '@/components/ui/skeleton'
import type { HeatmapCell, TrendPoint } from '@/lib/api/tp-types'
import { HeatmapGrid } from './HeatmapGrid'
import { TrendChart } from './TrendChart'

interface AnalyticsViewProps {
  cells: HeatmapCell[]
  trend: TrendPoint[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

/** The department by topic gap grid and the trend by semester, each with its own empty state. */
export function AnalyticsView({ cells, trend, loading, error, onRetry }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <Section
        title="Topic gaps by department"
        description="Average score for each topic. Lower scores are bigger gaps."
      >
        {loading ? (
          <div role="status" aria-label="Loading gaps" className="p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <ErrorState title="The gap grid could not be loaded" onRetry={onRetry} />
        ) : cells.length === 0 ? (
          <EmptyState
            icon={ChartNoAxesColumn}
            title="No gap data yet"
            description="After students complete assessments, each department and topic appears here with its average score."
          />
        ) : (
          <div className="p-4">
            <HeatmapGrid cells={cells} />
          </div>
        )}
      </Section>
      <ChartCard
        title="Average score by semester"
        description="How scores are moving over time."
        dataCount={trend.length}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No trend yet"
        emptyDescription="The trend appears once assessments have been taken in more than one semester."
      >
        <TrendChart points={trend} />
      </ChartCard>
    </div>
  )
}
