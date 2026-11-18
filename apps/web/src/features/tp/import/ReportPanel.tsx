import { CircleCheck } from 'lucide-react'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ValidationReport } from './validate'

const SHOWN = 50

/** What the file would import: counts, the problems row by row, and roll numbers that look wrong. */
export function ReportPanel({ report }: { report: ValidationReport }) {
  const rowsWithIssues = new Set(report.issues.map((i) => i.line)).size
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Rows in file" value={report.totalRows} />
        <StatCard label="Valid rows" value={report.validRows} />
        <StatCard label="Rows with errors" value={rowsWithIssues} />
        <StatCard label="Invalid format" value={report.invalidFormat.length} />
      </div>
      <p className="text-sm text-text-muted">
        These checks use the file alone. Whether a roll number belongs to a registered student is
        checked against the registered students when the import runs.
      </p>

      <Section
        title="Errors"
        description={
          report.issues.length > SHOWN ? `First ${SHOWN} of ${report.issues.length}` : undefined
        }
      >
        {report.issues.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-4 text-base text-text">
            <CircleCheck className="size-4 text-success" aria-hidden="true" />
            No errors found in this file.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-surface-muted">
                <TableHead data-numeric="true">Line</TableHead>
                <TableHead>Roll number</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Problem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.issues.slice(0, SHOWN).map((i, n) => (
                <TableRow key={`${i.line}-${i.field}-${n}`}>
                  <TableCell data-numeric="true">{i.line}</TableCell>
                  <TableCell className="font-mono text-sm">{i.rollNo || '—'}</TableCell>
                  <TableCell>{i.field}</TableCell>
                  <TableCell>{i.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {report.invalidFormat.length > 0 && (
        <Section
          title="Invalid format"
          description="These roll numbers do not look like a roll number."
        >
          <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 font-mono text-sm text-text">
            {report.invalidFormat.slice(0, SHOWN).map((r) => (
              <li key={r.line}>
                line {r.line}: {r.rollNo || '(empty)'}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
