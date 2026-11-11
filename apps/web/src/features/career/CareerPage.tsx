import { Briefcase, ChevronRight } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { IMPORTANCE } from '@/features/resume/labels'
import { useCareerInterests, useRoles, useSaveCareerInterests } from '@/features/resume/queries'
import { describeError } from '@/lib/api/errors'
import type { Importance, RoleDefinition } from '@/lib/api/resume-types'
import { cn } from '@/lib/utils'

const LEVELS: Importance[] = ['core', 'important', 'bonus']

interface RoleEntryProps {
  role: RoleDefinition
  interested: boolean
  /** Interests are loading, failed to load, or a save is in progress. */
  toggleDisabled: boolean
  onToggle: () => void
}

function RoleEntry({ role, interested, toggleDisabled, onToggle }: RoleEntryProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-sm text-left"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn('size-4 shrink-0 self-center text-text-muted', open && 'rotate-90')}
          />
          <span className="text-base font-medium text-text">{role.name}</span>
          <span className="text-sm text-text-muted">{role.branches.join(', ')}</span>
          <span className="text-sm text-text-muted">{role.skills.length} skills</span>
        </button>
        {interested && <StatusBadge tone="info" label="Interested" />}
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={interested}
          disabled={toggleDisabled}
          onClick={onToggle}
        >
          {interested ? 'Remove interest' : 'Mark as interest'}
          <span className="sr-only"> in {role.name}</span>
        </Button>
      </div>
      {open && (
        <div id={panelId} className="space-y-3 px-4 pb-4 pl-11">
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
      )}
    </div>
  )
}

/** The role catalogue: what each role needs, and a way to mark the roles you are interested in. */
export default function CareerPage() {
  const roles = useRoles()
  const interests = useCareerInterests()
  const save = useSaveCareerInterests()
  const [search, setSearch] = useState('')

  const saved = interests.data?.roleSlugs ?? []
  const shown = (roles.data ?? []).filter((r) =>
    `${r.name} ${r.summary} ${r.branches.join(' ')}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  )

  const toggle = async (role: RoleDefinition) => {
    const next = saved.includes(role.slug)
      ? saved.filter((s) => s !== role.slug)
      : [...saved, role.slug]
    try {
      await save.mutateAsync(next)
      toast(
        next.includes(role.slug)
          ? `${role.name} marked as an interest`
          : `${role.name} removed from your interests`,
      )
    } catch (error) {
      toast.error(`Could not save your interests. ${describeError(error)}`)
    }
  }

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
    body = shown.map((role) => (
      <RoleEntry
        key={role.slug}
        role={role}
        interested={saved.includes(role.slug)}
        toggleDisabled={!interests.isSuccess || save.isPending}
        onToggle={() => void toggle(role)}
      />
    ))
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Career interests' }]}
        title="Career interests"
        description="The roles you can prepare for and the skills each one expects. Mark the ones you are interested in."
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
      {interests.isError && (
        <p
          role="alert"
          className="mb-3 flex max-w-4xl flex-wrap items-center gap-3 text-base text-danger"
        >
          Your saved interests could not be loaded, so they cannot be changed right now.
          <Button variant="secondary" size="sm" onClick={() => void interests.refetch()}>
            Try again
          </Button>
        </p>
      )}
      <p className="mb-3 text-sm text-text-muted" aria-live="polite">
        {interests.isSuccess
          ? `${saved.length} of ${(roles.data ?? []).length || 14} roles marked as interests.`
          : ''}
      </p>
      <div className="max-w-4xl rounded-md border border-border bg-surface">{body}</div>
    </>
  )
}
