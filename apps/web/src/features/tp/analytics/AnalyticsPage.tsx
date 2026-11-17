import { Download } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Button } from '@/components/ui/button'
import { useGapHeatmap, useSemesterTrends } from '@/lib/api/pending'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { notifyUnavailable } from '@/lib/notify'
import { AnalyticsView } from './AnalyticsView'

const ALL = 'all'
const SEMESTERS = [
  { value: ALL, label: 'All semesters' },
  ...Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` })),
]
const TRACKS = [
  { value: ALL, label: 'All tracks' },
  { value: 'technical', label: 'Technical' },
  { value: 'non_technical', label: 'Non-technical' },
]

export default function AnalyticsPage() {
  const cells = useGapHeatmap()
  const trend = useSemesterTrends()
  const departments = useDepartmentOptions()
  const [department, setDepartment] = useState(ALL)
  const [semester, setSemester] = useState(ALL)
  const [track, setTrack] = useState(ALL)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/tp' }, { label: 'Analytics' }]}
        title="Analytics"
        description="Where students are weak, by department and topic, and how that is changing."
        action={
          <Button variant="secondary" onClick={notifyUnavailable}>
            <Download /> Export
          </Button>
        }
      />
      <div className="mb-4 flex max-w-5xl flex-wrap gap-3">
        <SelectField
          label="Department"
          value={department}
          onChange={setDepartment}
          options={[{ value: ALL, label: 'All departments' }, ...departments.options]}
          className="grid w-full gap-1.5 sm:w-56"
        />
        <SelectField
          label="Semester"
          value={semester}
          onChange={setSemester}
          options={SEMESTERS}
          className="grid w-full gap-1.5 sm:w-44"
        />
        <SelectField
          label="Track"
          value={track}
          onChange={setTrack}
          options={TRACKS}
          className="grid w-full gap-1.5 sm:w-44"
        />
      </div>
      <div className="max-w-5xl">
        <AnalyticsView
          cells={cells.data}
          trend={trend.data}
          loading={cells.isLoading}
          error={cells.isError}
          onRetry={cells.refetch}
        />
      </div>
    </>
  )
}
