import type { ColumnDef } from '@tanstack/react-table'
import { GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { useMentoredStudents } from '@/lib/api/pending'
import type { MentoredStudent, StudentStatus } from '@/lib/api/faculty-types'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { formatDate } from '@/lib/format'

const STATUS: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  on_track: { label: 'On track', tone: 'success' },
  needs_attention: { label: 'Needs attention', tone: 'warning' },
  inactive: { label: 'Inactive', tone: 'neutral' },
}

const ALL = 'all'
const STATUS_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  ...Object.entries(STATUS).map(([value, { label }]) => ({ value, label })),
]
const thisYear = new Date().getFullYear()
const YEAR_OPTIONS = [
  { value: ALL, label: 'All years' },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: String(thisYear + i),
    label: String(thisYear + i),
  })),
]

const COLUMNS: ColumnDef<MentoredStudent, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link to={`/f/students/${row.original.id}`} className="text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'rollNo',
    header: 'Roll no',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.rollNo}</span>,
  },
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'graduationYear', header: 'Year', meta: { numeric: true } },
  {
    accessorKey: 'latestScorePercent',
    header: 'Latest score',
    meta: { numeric: true },
    cell: ({ row }) =>
      row.original.latestScorePercent === null ? '—' : `${row.original.latestScorePercent}%`,
  },
  {
    accessorKey: 'weakestTopic',
    header: 'Weakest topic',
    cell: ({ row }) => row.original.weakestTopic ?? '—',
  },
  {
    accessorKey: 'lastActivityAt',
    header: 'Last activity',
    cell: ({ row }) =>
      row.original.lastActivityAt ? formatDate(row.original.lastActivityAt) : 'No activity',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = STATUS[row.original.status]
      return <StatusBadge tone={s.tone} label={s.label} />
    },
  },
]

export default function StudentsPage() {
  const students = useMentoredStudents()
  const departments = useDepartmentOptions()
  const [department, setDepartment] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const deptOptions = [{ value: ALL, label: 'All departments' }, ...departments.options]
  const filtered = useMemo(
    () =>
      students.data.filter((s) => {
        return (
          (department === ALL || s.departmentId === department) &&
          (year === ALL || String(s.graduationYear) === year) &&
          (status === ALL || s.status === status)
        )
      }),
    [students.data, department, year, status],
  )

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/f' }, { label: 'Students' }]}
        title="Students"
        description="The students assigned to you for mentoring."
      />
      <div className="max-w-6xl">
        <DataTable
          columns={COLUMNS}
          data={filtered}
          loading={students.isLoading}
          error={students.isError}
          onRetry={students.refetch}
          searchLabel="Search students"
          searchPlaceholder="Name or roll no"
          filters={
            <>
              <SelectField
                label="Department"
                hideLabel
                value={department}
                onChange={setDepartment}
                options={deptOptions}
                className="w-full sm:w-52"
              />
              <SelectField
                label="Graduation year"
                hideLabel
                value={year}
                onChange={setYear}
                options={YEAR_OPTIONS}
                className="w-full sm:w-36"
              />
              <SelectField
                label="Status"
                hideLabel
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                className="w-full sm:w-44"
              />
            </>
          }
          empty={
            <EmptyState
              icon={GraduationCap}
              title="No students assigned yet"
              description="Students the placement team assigns to you appear here with their latest score and weakest topic."
            />
          }
        />
      </div>
    </>
  )
}
