import { Building2, CalendarClock, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Progress } from '@/components/ui/progress'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import { useCurrentUser } from '@/features/auth/auth-context'
import {
  useDepartmentReadiness,
  useTestParticipation,
  useTpUpcomingDrives,
} from '@/lib/api/pending'
import { formatDate, percent } from '@/lib/format'

function ReadinessSection() {
  const readiness = useDepartmentReadiness()
  return (
    <Section title="Department readiness" description="Average readiness of assessed students.">
      {readiness.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No readiness data yet"
          description="Each department appears here with its average readiness once students have been assessed."
        />
      ) : (
        <ul className="divide-y divide-border">
          {readiness.data.map((d) => (
            <li
              key={d.department}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-center"
            >
              <span className="text-base text-text">{d.department}</span>
              <Progress value={d.readinessPercent ?? 0} aria-label={`${d.department} readiness`} />
              <span className="text-sm text-text-muted tabular-nums">
                {d.readinessPercent === null ? '—' : `${d.readinessPercent}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ParticipationSection() {
  const rows = useTestParticipation()
  return (
    <Section title="Test participation">
      {rows.data.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No assessments yet"
          description="For each assessment, how many invited students attempted it appears here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {rows.data.map((r) => (
            <li key={r.assessmentTitle} className="flex justify-between gap-3 px-4 py-3 text-base">
              <span>{r.assessmentTitle}</span>
              <span className="text-text-muted tabular-nums">
                {r.attempted} of {r.invited} ({percent(r.attempted, r.invited)}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function UpcomingSection() {
  const drives = useTpUpcomingDrives()
  return (
    <Section
      title="Upcoming drives"
      action={
        <Link to="/tp/drives" className="text-base text-primary hover:underline">
          All drives
        </Link>
      }
    >
      {drives.data.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming drives"
          description="Drives with a date coming up appear here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {drives.data.map((d) => (
            <li key={d.id} className="flex justify-between gap-3 px-4 py-3 text-base">
              <span>
                {d.company}, {d.role}
              </span>
              <span className="text-text-muted">{formatDate(d.driveDate)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default function TpOverviewPage() {
  const user = useCurrentUser()
  return (
    <>
      <PageHeader title="Overview" description={`Signed in as ${user.fullName}.`} />
      <div className="mb-6 grid max-w-5xl gap-3 sm:grid-cols-4">
        <StatCard label="Registered students" value={null} />
        <StatCard label="Average readiness" value={null} />
        <StatCard label="Open drives" value={null} />
        <StatCard label="Placed so far" value={null} />
      </div>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ReadinessSection />
          <ParticipationSection />
        </div>
        <UpcomingSection />
      </div>
    </>
  )
}
