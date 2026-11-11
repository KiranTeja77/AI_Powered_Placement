import { PageHeader } from '@/components/PageHeader'
import { HistoryTable } from './HistoryTable'
import { HowItWorksPanel } from './HowItWorksPanel'
import { ResumeForm } from './ResumeForm'

export default function ResumePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Resume analyzer' }]}
        title="Resume analyzer"
        description="Paste your resume to see which skills it shows and how ready you are for each role."
      />
      <div className="space-y-8">
        <ResumeForm />
        <HowItWorksPanel />
        <HistoryTable />
      </div>
    </>
  )
}
