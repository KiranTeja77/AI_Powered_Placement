import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DataTablePagination } from '@/components/DataTablePagination'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AnalysisSummary } from '@/lib/api/resume-types'
import { Button } from '@/components/ui/button'
import { DeleteAnalysisDialog } from './DeleteAnalysisDialog'
import { formatDateTime, formatPercent, pluralize } from './format'
import { useAnalyses } from './queries'

function rolesLabel(row: AnalysisSummary): string {
  return row.targetRoles.length === 0 ? 'All roles' : row.targetRoles.map((r) => r.name).join(', ')
}

/** A quiet text button; the date in its name tells screen-reader users which row it deletes. */
function deleteButton(row: AnalysisSummary) {
  return (
    <Button variant="ghost" size="sm" className="ml-2 text-danger">
      Delete<span className="sr-only"> analysis from {formatDateTime(row.createdAt)}</span>
    </Button>
  )
}

function readiness(row: AnalysisSummary): string {
  return row.topScore === null ? 'No score' : formatPercent(row.topScore)
}

/** The student's past analyses, newest first, with server-side paging. */
export function HistoryTable() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, refetch } = useAnalyses(page)

  let body
  if (isLoading) {
    body = (
      <div className="space-y-px p-3" role="status" aria-label="Loading past analyses">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  } else if (isError || !data) {
    body = <ErrorState title="Past analyses could not be loaded" onRetry={() => void refetch()} />
  } else if (data.totalItems === 0) {
    body = (
      <EmptyState
        icon={FileText}
        title="No analyses yet"
        description="Your analyses will appear here after you analyze a resume."
      />
    )
  } else {
    body = (
      <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-surface-muted">
                <TableHead>Date</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Best match</TableHead>
                <TableHead data-numeric="true">Readiness</TableHead>
                <TableHead data-numeric="true">Skills</TableHead>
                <TableHead>
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-64 truncate">{rolesLabel(row)}</TableCell>
                  <TableCell>{row.topRole?.name ?? '—'}</TableCell>
                  <TableCell data-numeric="true">{readiness(row)}</TableCell>
                  <TableCell data-numeric="true">{row.skillCount}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {row.edited && <StatusBadge tone="info" label="Edited" className="mr-3" />}
                    <Link to={`/s/resume/${row.id}`} className="text-primary hover:underline">
                      View
                    </Link>
                    <DeleteAnalysisDialog id={row.id} trigger={deleteButton(row)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="divide-y divide-border md:hidden">
          {data.items.map((row) => (
            <li key={row.id} className="space-y-1 px-3 py-3 text-base">
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Date</span>
                <span>{formatDateTime(row.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Roles</span>
                <span className="text-right">{rolesLabel(row)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Readiness</span>
                <span>
                  {readiness(row)}
                  {row.topRole ? ` · ${row.topRole.name}` : ''}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Skills</span>
                <span>{pluralize(row.skillCount, 'skill')}</span>
              </div>
              <Link
                to={`/s/resume/${row.id}`}
                className="inline-block pt-1 text-primary hover:underline"
              >
                View analysis
              </Link>
            </li>
          ))}
        </ul>
        <DataTablePagination
          page={data.page}
          pageCount={data.totalPages}
          total={data.totalItems}
          onPrevious={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </>
    )
  }

  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="mb-3 text-md font-semibold text-text">
        Past analyses
      </h2>
      <div className="max-w-4xl rounded-md border border-border bg-surface">{body}</div>
    </section>
  )
}
