import { useQuery } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { authApi } from '@/lib/api/auth-api'
import { DepartmentDialog } from './DepartmentDialog'

/** The real department list. Adding and editing are built and checked, but cannot save yet. */
export default function DepartmentsPage() {
  const departments = useQuery({ queryKey: ['departments'], queryFn: authApi.departments })
  const rows = departments.data ?? []

  let body
  if (departments.isLoading) {
    body = (
      <div role="status" aria-label="Loading departments" className="space-y-px p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  } else if (departments.isError) {
    body = (
      <ErrorState
        title="Departments could not be loaded"
        onRetry={() => void departments.refetch()}
      />
    )
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={Building2}
        title="No departments yet"
        description="Departments appear here. Students and faculty choose from this list."
      />
    )
  } else {
    body = (
      <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-surface-muted">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="text-right">
                    <DepartmentDialog
                      initial={{ code: d.code, name: d.name }}
                      trigger={
                        <Button variant="secondary" size="sm">
                          Edit<span className="sr-only"> {d.name}</span>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="divide-y divide-border md:hidden">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <span>
                <span className="font-mono text-sm">{d.code}</span>
                <span className="block text-base text-text">{d.name}</span>
              </span>
              <DepartmentDialog
                initial={{ code: d.code, name: d.name }}
                trigger={
                  <Button variant="secondary" size="sm">
                    Edit<span className="sr-only"> {d.name}</span>
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/admin' }, { label: 'Departments' }]}
        title="Departments"
        description="The departments students, faculty and drives are grouped by."
        action={
          <DepartmentDialog
            trigger={
              <Button>
                <Plus /> Add department
              </Button>
            }
          />
        }
      />
      <div className="max-w-4xl rounded-md border border-border bg-surface">{body}</div>
    </>
  )
}
