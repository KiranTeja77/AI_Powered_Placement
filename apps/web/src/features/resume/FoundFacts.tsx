import type { ResumeResult } from '@/lib/api/resume-types'
import { pluralize } from './format'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="text-base text-text">{value}</dd>
    </div>
  )
}

/** The plain facts read from the resume, so a wrong reading is easy to spot. */
export function FoundFacts({ fields, sections }: Pick<ResumeResult, 'fields' | 'sections'>) {
  const none = 'Not found'
  const names = [...new Set(sections.filter((s) => s.heading).map((s) => s.heading as string))]
  return (
    <details className="max-w-4xl rounded-md border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-base font-medium text-text">
        What was read from your resume
      </summary>
      <dl className="space-y-2 border-t border-border px-4 py-3">
        <Fact label="Email" value={fields.emails.map((e) => e.text).join(', ') || none} />
        <Fact label="Phone" value={fields.phones.map((p) => p.text.trim()).join(', ') || none} />
        <Fact label="Links" value={fields.links.map((l) => l.text).join(', ') || none} />
        <Fact label="Education" value={fields.education.map((e) => e.degree).join(', ') || none} />
        <Fact
          label={fields.cgpa?.kind === 'percentage' ? 'Percentage' : 'CGPA'}
          value={
            fields.cgpa
              ? fields.cgpa.kind === 'percentage'
                ? `${fields.cgpa.value}%`
                : `${fields.cgpa.value} out of ${fields.cgpa.scale}`
              : none
          }
        />
        <Fact
          label="Projects"
          value={
            fields.projectTitles.length
              ? `${pluralize(fields.projectTitles.length, 'project')}: ${fields.projectTitles.map((t) => t.text).join(', ')}`
              : none
          }
        />
        <Fact label="Sections" value={names.join(', ') || none} />
      </dl>
    </details>
  )
}
