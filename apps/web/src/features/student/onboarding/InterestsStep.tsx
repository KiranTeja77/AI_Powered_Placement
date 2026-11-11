import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useCareerInterests, useRoles, useSaveCareerInterests } from '@/features/resume/queries'
import { describeError } from '@/lib/api/errors'
import type { RoleDefinition } from '@/lib/api/resume-types'

function Choices({
  roles,
  initial,
  onNext,
  onBack,
}: {
  roles: RoleDefinition[]
  initial: string[]
  onNext: () => void
  onBack: () => void
}) {
  const [chosen, setChosen] = useState<string[]>(initial)
  const save = useSaveCareerInterests()

  const toggle = (slug: string, on: boolean) =>
    setChosen((prev) => (on ? [...prev, slug] : prev.filter((s) => s !== slug)))

  const submit = async () => {
    try {
      await save.mutateAsync(chosen)
      onNext()
    } catch (error) {
      toast.error(`Could not save your interests. ${describeError(error)}`)
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-base text-text">
          Choose the roles you want to prepare for. You can change this later.
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <div key={role.slug} className="flex items-center gap-2">
              <Checkbox
                id={`interest-${role.slug}`}
                checked={chosen.includes(role.slug)}
                onCheckedChange={(v) => toggle(role.slug, v === true)}
              />
              <Label htmlFor={`interest-${role.slug}`} className="font-normal">
                {role.name}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => void submit()} disabled={save.isPending}>
          {save.isPending ? 'Saving' : chosen.length === 0 ? 'Skip for now' : 'Save and continue'}
        </Button>
      </div>
    </div>
  )
}

/** Step 3. Real: reads and saves the student's career interests. */
export function InterestsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const roles = useRoles()
  const interests = useCareerInterests()

  if (roles.isLoading || interests.isLoading) {
    return (
      <div role="status" aria-label="Loading roles" className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-48" />
        ))}
      </div>
    )
  }
  if (roles.isError || interests.isError || !roles.data || !interests.data) {
    return (
      <ErrorState
        title="Roles could not be loaded"
        className="items-start px-0 sm:items-start sm:text-left"
        onRetry={() => {
          void roles.refetch()
          void interests.refetch()
        }}
      />
    )
  }
  return (
    <Choices
      roles={roles.data}
      initial={interests.data.roleSlugs}
      onNext={onNext}
      onBack={onBack}
    />
  )
}
