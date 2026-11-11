import { Briefcase } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { IMPORTANCE } from '@/features/resume/labels'
import { useRoles } from '@/features/resume/queries'
import type { Importance, RoleDefinition } from '@/lib/api/resume-types'

const LEVELS: Importance[] = ['core', 'important', 'bonus']

function RoleEntry({ role }: { role: RoleDefinition }) {
  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
        <span className="text-base font-medium text-text">{role.name}</span>
        <span className="text-sm text-text-muted">{role.branches.join(', ')}</span>
        <span className="ml-auto text-sm text-text-muted">{role.skills.length} skills</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-base text-text-muted">{role.summary}</p>
        {LEVELS.map((level) => {
          const skills = role.skills.filter((s) => s.importance === level)
          return (
            <div key={level}>
              <h3 className="mb-1.5 text-sm font-medium text-text">
                {IMPORTANCE[level]}{' '}
                <span className="font-normal text-text-muted">({skills.length})</span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <li key={skill.slug}>
                    <Badge variant={level === 'core' ? 'primary' : 'neutral'}>{skill.name}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </details>
  )
}

/** The role catalogue: what each role needs, with the most important skills first. */
export default function CareerPage() {
  const roles = useRoles()
  const [search, setSearch] = useState('')
  const shown = (roles.data ?? []).filter((r) =>
    `${r.name} ${r.summary} ${r.branches.join(' ')}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )

  let body
  if (roles.isLoading) {
    body = (
      <div role="status" aria-label="Loading roles" className="space-y-px p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  } else if (roles.isError) {
    body = <ErrorState title="Roles could not be loaded" onRetry={() => void roles.refetch()} />
  } else if ((roles.data ?? []).length === 0) {
    body = (
      <EmptyState
        icon={Briefcase}
        title="No roles yet"
        description="The roles you can prepare for will appear here."
      />
    )
  } else if (shown.length === 0) {
    body = <p className="px-4 py-8 text-base text-text-muted">No roles match your search.</p>
  } else {
    body = shown.map((role) => <RoleEntry key={role.slug} role={role} />)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Career interests' }]}
        title="Career interests"
        description="The roles you can prepare for and the skills each one expects. Core skills matter most."
      />
      <div className="mb-3 grid max-w-sm gap-1.5">
        <Label htmlFor="role-search">Search roles</Label>
        <Input
          id="role-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Role, branch or keyword"
        />
      </div>
      <div className="max-w-4xl rounded-md border border-border bg-surface">{body}</div>
    </>
  )
}
