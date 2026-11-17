import { ChevronRight, UsersRound } from 'lucide-react'
import { Fragment, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EligibilityReport, EligibilityStudent } from '@/lib/api/tp-types'
import { cn } from '@/lib/utils'
import { CriterionBadge } from './CriterionBadge'
import { OVERALL_LABEL, overallResult } from './criteria'

function Why({ student, id }: { student: EligibilityStudent; id: string }) {
  return (
    <div id={id} className="space-y-1 bg-surface-muted px-4 py-3 text-sm text-text">
      <p className="font-medium">Match explanation</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {student.explanation.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}

function ExplainButton({
  open,
  controls,
  name,
  onClick,
}: {
  open: boolean
  controls: string
  name: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
      className="flex items-center gap-1 rounded-sm text-primary hover:underline"
    >
      <ChevronRight className={cn('size-4', open && 'rotate-90')} aria-hidden="true" />
      Why<span className="sr-only"> for {name}</span>
    </button>
  )
}

/** Who meets which criterion for a drive, with an overall result and the reasoning behind it. */
export function EligibilityView({ report }: { report: EligibilityReport }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/tp' },
          { label: 'Drives', to: '/tp/drives' },
          { label: report.driveTitle },
          { label: 'Eligibility' },
        ]}
        title={`Eligibility, ${report.driveTitle}`}
        description={`Criteria source: ${report.criteriaSource}.`}
      />
      <div className="max-w-6xl space-y-3">
        <p className="text-sm text-text-muted">
          Unknown means a record needed for the check is missing. It is not the same as not met.
        </p>
        <Section title="Students">
          {report.students.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No students to show"
              description="Students in the eligible departments appear here with a result for each criterion."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-surface-muted">
                      <TableHead>Student</TableHead>
                      {report.criteria.map((c) => (
                        <TableHead key={c.id}>{c.label}</TableHead>
                      ))}
                      <TableHead>Overall</TableHead>
                      <TableHead>
                        <span className="sr-only">Explanation</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.students.map((s) => {
                      const overall = overallResult(Object.values(s.results))
                      const id = `why-${s.studentId}`
                      return (
                        <Fragment key={s.studentId}>
                          <TableRow>
                            <TableCell>
                              {s.name}
                              <span className="block font-mono text-xs text-text-muted">
                                {s.rollNo}
                              </span>
                            </TableCell>
                            {report.criteria.map((c) => (
                              <TableCell key={c.id}>
                                <CriterionBadge result={s.results[c.id] ?? 'unknown'} />
                              </TableCell>
                            ))}
                            <TableCell>
                              <CriterionBadge result={overall} />
                              <span className="sr-only"> {OVERALL_LABEL[overall]}</span>
                            </TableCell>
                            <TableCell>
                              <ExplainButton
                                open={open.has(s.studentId)}
                                controls={id}
                                name={s.name}
                                onClick={() => toggle(s.studentId)}
                              />
                            </TableCell>
                          </TableRow>
                          {open.has(s.studentId) && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={report.criteria.length + 3} className="p-0">
                                <Why student={s} id={id} />
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {report.students.map((s) => {
                  const overall = overallResult(Object.values(s.results))
                  const id = `why-m-${s.studentId}`
                  return (
                    <li key={s.studentId} className="space-y-2 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base text-text">{s.name}</p>
                          <p className="font-mono text-xs text-text-muted">{s.rollNo}</p>
                        </div>
                        <span>
                          <CriterionBadge result={overall} />
                          <span className="sr-only"> {OVERALL_LABEL[overall]}</span>
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {report.criteria.map((c) => (
                          <li key={c.id} className="flex justify-between gap-2 text-sm">
                            <span className="text-text-muted">{c.label}</span>
                            <CriterionBadge result={s.results[c.id] ?? 'unknown'} />
                          </li>
                        ))}
                      </ul>
                      <ExplainButton
                        open={open.has(s.studentId)}
                        controls={id}
                        name={s.name}
                        onClick={() => toggle(s.studentId)}
                      />
                      {open.has(s.studentId) && <Why student={s} id={id} />}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Section>
      </div>
    </>
  )
}
