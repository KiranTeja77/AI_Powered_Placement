import { StatusBadge } from '@/components/StatusBadge'
import { Progress } from '@/components/ui/progress'
import type { GapStatus, Importance, RoleReadiness } from '@/lib/api/resume-types'
import { BreakdownTable } from './BreakdownTable'
import { formatPercent, formatPoints } from './format'
import { GAP, IMPORTANCE } from './labels'

function RoleReadinessCard({ role }: { role: RoleReadiness }) {
  const headingId = `role-${role.roleId}`
  return (
    <article aria-labelledby={headingId} className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 id={headingId} className="text-md font-semibold text-text">
          {role.name}
        </h3>
        <p
          className="text-xl font-semibold text-text"
          aria-label={`Readiness ${role.score} percent`}
        >
          {formatPercent(role.score)}
        </p>
      </div>
      <Progress value={role.score} aria-label={`${role.name} readiness`} />
      <p className="text-sm text-text-muted">
        {formatPoints(role.earned)} of {formatPoints(role.maximum)} points available
      </p>
      <BreakdownTable role={role} />
      <details className="text-base">
        <summary className="cursor-pointer text-primary">Skill by skill for {role.name}</summary>
        <ul className="mt-2 divide-y divide-border">
          {role.items.map((item) => {
            const gap = GAP[item.status as GapStatus]
            return (
              <li key={item.skillId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 flex-1 text-text">{item.name}</span>
                <span className="text-sm text-text-muted">
                  {IMPORTANCE[item.importance as Importance]}
                </span>
                <StatusBadge tone={gap.tone} label={gap.label} />
                <span className="w-24 text-right text-sm text-text-muted">
                  {formatPoints(item.points)} of {item.weight}
                </span>
              </li>
            )
          })}
        </ul>
      </details>
    </article>
  )
}

interface ReadinessPanelProps {
  roles: RoleReadiness[]
  edited: boolean
}

/** Readiness per role: the percentage, the points behind it and how each skill was counted. */
export function ReadinessPanel({ roles, edited }: ReadinessPanelProps) {
  return (
    <section aria-labelledby="readiness-heading" className="space-y-3">
      <div>
        <h2 id="readiness-heading" className="text-md font-semibold text-text">
          Readiness by role
        </h2>
        <p className="text-base text-text-muted">
          {edited ? 'Recalculated with your changes. ' : ''}
          Readiness is the points you earn divided by the points available. A core skill is worth 3
          points, an important one 2 and a bonus one 1. A skill used in a project or internship
          counts in full and one only listed counts half.
        </p>
      </div>
      <div className="max-w-4xl divide-y divide-border rounded-md border border-border bg-surface">
        {roles.map((role) => (
          <RoleReadinessCard key={role.roleId} role={role} />
        ))}
      </div>
    </section>
  )
}
