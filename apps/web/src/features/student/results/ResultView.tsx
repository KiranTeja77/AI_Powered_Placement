import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Progress } from '@/components/ui/progress'
import type { AttemptResult } from '@/lib/api/student-types'
import { formatClock, percent } from '../common/format'
import { Section } from '../common/Section'

/** The result of one attempt: totals, accuracy by topic, the answer review and what to practise. */
export function ResultView({ result }: { result: AttemptResult }) {
  const correct = result.answers.filter((a) => a.correct).length
  const attempted = result.answers.filter((a) => a.yourAnswer !== null).length
  const accuracy = attempted === 0 ? null : percent(correct, attempted)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/s' },
          { label: 'Assessments', to: '/s/assessments?tab=completed' },
          { label: 'Result' },
        ]}
        title={result.assessmentTitle}
        description="Your result and a review of every answer."
      />
      <div className="max-w-4xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Score" value={`${result.score} of ${result.maxScore}`} />
          <StatCard
            label="Accuracy"
            value={accuracy === null ? null : `${accuracy}%`}
            hint="Of the questions you answered"
          />
          <StatCard label="Time taken" value={formatClock(result.timeSpentSeconds)} />
        </div>

        <Section title="Accuracy by topic">
          <ul className="divide-y divide-border">
            {result.topics.map((t) => (
              <li
                key={t.topic}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[200px_1fr_auto] sm:items-center"
              >
                <span className="text-base text-text">{t.topic}</span>
                <Progress value={percent(t.correct, t.total)} aria-label={`${t.topic} accuracy`} />
                <span className="text-sm text-text-muted tabular-nums">
                  {t.correct} of {t.total} ({percent(t.correct, t.total)}%)
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Answer review">
          <ol className="divide-y divide-border">
            {result.answers.map((a, i) => (
              <li key={a.questionId} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base font-medium text-text">
                    {i + 1}. {a.prompt}
                  </p>
                  <StatusBadge
                    tone={a.yourAnswer === null ? 'warning' : a.correct ? 'success' : 'danger'}
                    label={
                      a.yourAnswer === null ? 'Not answered' : a.correct ? 'Correct' : 'Incorrect'
                    }
                  />
                </div>
                <p className="text-sm text-text-muted">
                  Your answer: <span className="text-text">{a.yourAnswer ?? 'None'}</span>
                </p>
                {!a.correct && (
                  <p className="text-sm text-text-muted">
                    Correct answer: <span className="text-text">{a.correctAnswer}</span>
                  </p>
                )}
                <p className="text-sm text-text-muted">{a.explanation}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Recommended practice" description="Where more practice would help most.">
          {result.recommended.length === 0 ? (
            <p className="px-4 py-6 text-base text-text-muted">
              No practice is recommended for this attempt.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {result.recommended.map((r) => (
                <li
                  key={r.topic}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="text-base font-medium text-text">{r.topic}</p>
                    <p className="text-sm text-text-muted">{r.reason}</p>
                  </div>
                  <Link to={r.to} className="text-base text-primary hover:underline">
                    Practise
                    <span className="sr-only"> {r.topic}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  )
}
