import { ChartNoAxesColumn, ClipboardCheck, FileText, NotebookPen } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import type { Student360 } from '@/lib/api/faculty-types'
import { formatDate } from '@/lib/format'
import { AddNoteDialog } from '../mentoring/AddNoteDialog'
import { AssignPracticeDialog } from './AssignPracticeDialog'

/** One student in full: profile, tests, topic gaps, resume, and the mentoring notes about them. */
export function Student360View({ data }: { data: Student360 }) {
  const { student, resume } = data
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/f' },
          { label: 'Students', to: '/f/students' },
          { label: student.name },
        ]}
        title={student.name}
        description={`${student.department}, class of ${student.graduationYear}`}
        action={<AssignPracticeDialog studentName={student.name} />}
      />
      <div className="max-w-5xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Roll number" value={student.rollNo} />
          <StatCard
            label="Latest score"
            value={student.latestScorePercent === null ? null : `${student.latestScorePercent}%`}
          />
          <StatCard label="Weakest topic" value={student.weakestTopic} />
        </div>

        <Section title="Test history">
          {data.tests.length === 0 && (
            <EmptyState
              icon={ClipboardCheck}
              title="No tests taken yet"
              description="Assessments this student completes appear here with their scores."
            />
          )}
          <ul className="divide-y divide-border">
            {data.tests.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-3 text-base">
                <span>
                  {t.title}
                  <span className="text-text-muted">, {formatDate(t.at)}</span>
                </span>
                <span className="tabular-nums">{t.percent}%</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Topic gaps" description="Lowest scores first.">
          {data.gaps.length === 0 && (
            <EmptyState
              icon={ChartNoAxesColumn}
              title="No topic gaps yet"
              description="After a few assessments, the topics this student scores lowest in appear here."
            />
          )}
          <ul className="divide-y divide-border">
            {data.gaps.map((g) => (
              <li
                key={g.topic}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[200px_1fr_auto] sm:items-center"
              >
                <span className="text-base text-text">{g.topic}</span>
                <Progress value={g.percent} aria-label={`${g.topic} score`} />
                <span className="text-sm text-text-muted tabular-nums">{g.percent}%</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Resume analysis">
          {!resume && (
            <EmptyState
              icon={FileText}
              title="No resume analysis yet"
              description="Once the student analyzes a resume, their best match and skill count appear here."
            />
          )}
          {resume && (
            <p className="px-4 py-3 text-base text-text">
              Analyzed {formatDate(resume.analyzedAt)}. Best match {resume.topRole} at{' '}
              {resume.readinessPercent}% with {resume.skillCount} skills found.
            </p>
          )}
        </Section>

        <Section title="Mentoring notes" action={<AddNoteDialog rollNo={student.rollNo} />}>
          {data.notes.length === 0 && (
            <EmptyState
              icon={NotebookPen}
              title="No mentoring notes yet"
              description="Notes you write about this student appear here, newest first."
            />
          )}
          <ul className="divide-y divide-border">
            {data.notes.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <p className="text-sm text-text-muted">{formatDate(n.at)}</p>
                <p className="text-base text-text">{n.note}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
