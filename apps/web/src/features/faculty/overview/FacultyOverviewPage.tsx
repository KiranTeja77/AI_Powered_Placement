import { AlarmClock, ClipboardCheck, UserRoundSearch } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import { useCurrentUser } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'
import {
  useFollowUpsDue,
  useMentoredStudents,
  useRecentResults,
  useStudentsNeedingAttention,
} from '@/lib/api/pending'

function AttentionSection() {
  const students = useStudentsNeedingAttention()
  return (
    <Section
      title="Students needing attention"
      action={
        <Link to="/f/students" className="text-base text-primary hover:underline">
          All students
        </Link>
      }
    >
      {students.data.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title="No students need attention"
          description="Students who are inactive or falling behind appear here with the reason."
        />
      ) : (
        <ul className="divide-y divide-border">
          {students.data.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <Link to={`/f/students/${s.id}`} className="text-base text-primary hover:underline">
                {s.name}
              </Link>
              <p className="text-sm text-text-muted">{s.attentionReason}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ResultsSection() {
  const results = useRecentResults()
  return (
    <Section title="Recent results">
      {results.data.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No recent results"
          description="Scores from your students' assessments appear here as they are submitted."
        />
      ) : (
        <ul className="divide-y divide-border">
          {results.data.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 px-4 py-3 text-base">
              <span>
                {r.studentName}, {r.assessmentTitle}
              </span>
              <span className="tabular-nums">{r.percent}%</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function FollowUpsSection() {
  const followUps = useFollowUpsDue()
  return (
    <Section
      title="Follow-ups due"
      action={
        <Link to="/f/mentoring" className="text-base text-primary hover:underline">
          Mentoring log
        </Link>
      }
    >
      {followUps.data.length === 0 ? (
        <EmptyState
          icon={AlarmClock}
          title="No follow-ups due"
          description="Follow-up dates you set in the mentoring log appear here when they are close."
        />
      ) : (
        <ul className="divide-y divide-border">
          {followUps.data.map((f) => (
            <li key={f.id} className="px-4 py-3">
              <p className="text-base text-text">
                {f.studentName}, due {formatDate(f.dueOn)}
              </p>
              <p className="text-sm text-text-muted">{f.note}</p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default function FacultyOverviewPage() {
  const user = useCurrentUser()
  const students = useMentoredStudents()
  return (
    <>
      <PageHeader title="Overview" description={`Signed in as ${user.fullName}.`} />
      <div className="mb-6 grid max-w-5xl gap-3 sm:grid-cols-3">
        <StatCard
          label="Assigned students"
          value={students.data.length === 0 ? null : students.data.length}
          hint="Students you mentor"
        />
        <StatCard label="Average latest score" value={null} hint="Across your students" />
        <StatCard label="Awaiting review" value={null} hint="Proctoring alerts" />
      </div>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AttentionSection />
          <FollowUpsSection />
        </div>
        <ResultsSection />
      </div>
    </>
  )
}
