import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '@/lib/api/tp-types'

/** Average score by semester. Colours come from the design tokens. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <div
      role="img"
      aria-label={`Average score by semester: ${points.map((p) => `${p.semester} ${p.percent}%`).join(', ')}`}
      className="h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="semester"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
            width={44}
          />
          <Tooltip
            formatter={(v) => [`${String(v)}%`, 'Average score']}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
            }}
          />
          <Line
            type="monotone"
            dataKey="percent"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--chart-1)' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
