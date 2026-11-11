import { CalendarClock, ClipboardCheck, ListTodo } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { useCurrentUser } from '@/features/auth/auth-context'
import { useLatestScores, useUpcomingDrives, useWeeklyTasks } from '@/lib/api/pending'
import { formatDate, formatMinutes } from '../common/format'
import { Section } from '../common/Section'
import { ChecklistPanel } from '../profile/ChecklistPanel'
import { useProfileChecklist } from '../profile/completeness'

function TasksSection() {
  const tasks = useWeeklyTasks()
  return (
    <Section
      title="This week's tasks"
      action={
        <Link to="/s/roadmap" className="text-base text-primary hover:underline">
          Open roadmap
        </Link>
      }
    >
      {tasks.data.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks this week"
          description="Your weekly plan will list what to practise and why, once it is generated."
        />
      ) : (
        <ul className="divide-y divide-border">
          {tasks.data.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-base">
              <span>{t.title}</span>
              <span className="text-text-muted">{formatMinutes(t.estimatedMinutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ScoresSection() {
  const scores = useLatestScores()
  return (
    <Section title="Latest scores">
      {scores.data.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No scores yet"
          description="Scores from your assessments will appear here after you complete one."
        />
      ) : (
        <ul className="divide-y divide-border">
          {scores.data.map((s) => (
            <li key={s.assessmentTitle + s.at} className="flex justify-between gap-3 px-4 py-3">
              <span>{s.assessmentTitle}</span>
              <span className="tabular-nums">{s.percent}%</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function DrivesSection() {
  const drives = useUpcomingDrives()
  return (
    <Section
      title="Upcoming drives"
      action={
        <Link to="/s/drives" className="text-base text-primary hover:underline">
          All drives
        </Link>
      }
    >
      {drives.data.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming drives"
          description="Campus drives you can apply to will appear here with their deadlines."
        />
      ) : (
        <ul className="divide-y divide-border">
          {drives.data.map((d) => (
            <li key={d.id} className="flex justify-between gap-3 px-4 py-3">
              <Link to={`/s/drives/${d.id}`} className="text-primary hover:underline">
                {d.company}, {d.role}
              </Link>
              <StatusBadge tone="neutral" label={`Closes ${formatDate(d.deadline)}`} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default function OverviewPage() {
  const user = useCurrentUser()
  const { complete, total, loading } = useProfileChecklist()
  return (
    <>
      <PageHeader title="Overview" description={`Signed in as ${user.fullName}.`} />
      <div className="mb-6 grid max-w-5xl gap-3 sm:grid-cols-3">
        <StatCard
          label="Profile completeness"
          value={loading ? null : `${complete} of ${total}`}
          loading={loading}
          hint="Steps complete"
        />
        <StatCard label="Latest score" value={null} hint="After your first assessment" />
        <StatCard label="Tasks done this week" value={null} hint="Once a plan exists" />
      </div>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <TasksSection />
          <ScoresSection />
        </div>
        <div className="space-y-6">
          <DrivesSection />
          <ChecklistPanel />
        </div>
      </div>
    </>
  )
}
