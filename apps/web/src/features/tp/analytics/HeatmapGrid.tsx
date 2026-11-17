import { cn } from '@/lib/utils'
import type { HeatmapCell } from '@/lib/api/tp-types'

/** Score bands. Each has a tint, a number and a legend entry, so colour is never the only signal. */
const BANDS = [
  { max: 40, label: 'Below 40%', className: 'bg-danger/20' },
  { max: 60, label: '40 to 59%', className: 'bg-warning/20' },
  { max: 80, label: '60 to 79%', className: 'bg-primary/15' },
  { max: 101, label: '80% and above', className: 'bg-success/20' },
] as const

const bandFor = (percent: number) => BANDS.find((b) => percent < b.max) ?? BANDS[BANDS.length - 1]!

/** Departments down the side, topics across the top, average score in each cell. */
export function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  const departments = [...new Set(cells.map((c) => c.department))]
  const topics = [...new Set(cells.map((c) => c.topic))]
  const at = (department: string, topic: string) =>
    cells.find((c) => c.department === department && c.topic === topic)?.percent ?? null

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <caption className="sr-only">
            Average score by department and topic. Lower scores are bigger gaps.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left text-sm font-medium text-text-muted">
                Department
              </th>
              {topics.map((t) => (
                <th
                  key={t}
                  scope="col"
                  className="min-w-24 p-2 text-center text-sm font-medium text-text-muted"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d}>
                <th
                  scope="row"
                  className="p-2 text-left text-sm font-medium whitespace-nowrap text-text"
                >
                  {d}
                </th>
                {topics.map((t) => {
                  const value = at(d, t)
                  return (
                    <td
                      key={t}
                      className={cn(
                        'border border-bg p-2 text-center tabular-nums',
                        value === null
                          ? 'bg-surface-muted text-text-muted'
                          : bandFor(value).className,
                      )}
                    >
                      {value === null ? '—' : `${value}%`}
                      <span className="sr-only">
                        {value === null ? ', no attempts' : `, ${bandFor(value).label}`}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
        {BANDS.map((b) => (
          <li key={b.label} className="flex items-center gap-1.5">
            <span
              className={cn('size-3 rounded-sm border border-border', b.className)}
              aria-hidden="true"
            />
            {b.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-border bg-surface-muted"
            aria-hidden="true"
          />
          No attempts
        </li>
      </ul>
    </div>
  )
}
