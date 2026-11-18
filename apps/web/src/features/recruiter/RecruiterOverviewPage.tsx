import { Briefcase } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { StatCard } from '@/components/StatCard'
import { useCurrentUser } from '@/features/auth/auth-context'
import { useRecruiterDrives } from '@/lib/api/pending'
import { formatDate } from '@/lib/format'

export default function RecruiterOverviewPage() {
  const user = useCurrentUser()
  const drives = useRecruiterDrives()
  return (
    <>
      <PageHeader title="Overview" description={`Signed in as ${user.fullName}.`} />
      <div className="mb-6 grid max-w-4xl gap-3 sm:grid-cols-3">
        <StatCard
          label="Assigned drives"
          value={drives.data.length === 0 ? null : drives.data.length}
        />
        <StatCard label="Approved candidates" value={null} />
        <StatCard label="Offers made" value={null} />
      </div>
      <div className="max-w-4xl">
        <Section title="Assigned drives">
          {drives.data.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No drives assigned yet"
              description="Drives the placement team assigns to you appear here with the candidates approved for each."
            />
          ) : (
            <ul className="divide-y divide-border">
              {drives.data.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <Link to={`/r/drives/${d.id}`} className="text-base text-primary hover:underline">
                    {d.company}, {d.role}
                  </Link>
                  <span className="text-sm text-text-muted">
                    {formatDate(d.driveDate)}, {d.approvedCount} approved
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  )
}
