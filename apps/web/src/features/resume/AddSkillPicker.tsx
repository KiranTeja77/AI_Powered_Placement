import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SkillDefinition } from '@/lib/api/resume-types'
import { useSkillCatalogue } from './queries'
import type { AddedSkill } from './useSkillEdits'

interface AddSkillPickerProps {
  /** Skills that are already in the analysis or already added, which cannot be added again. */
  taken: Set<string>
  onAdd: (skill: AddedSkill) => void
}

function groupByCategory(skills: SkillDefinition[]): [string, SkillDefinition[]][] {
  const groups = new Map<string, SkillDefinition[]>()
  for (const skill of skills)
    groups.set(skill.category, [...(groups.get(skill.category) ?? []), skill])
  return [...groups.entries()]
}

/** Search the skill list and add a skill the analyzer did not find. */
export function AddSkillPicker({ taken, onAdd }: AddSkillPickerProps) {
  const [open, setOpen] = useState(false)
  const catalogue = useSkillCatalogue(open)
  const available = (catalogue.data ?? []).filter((s) => !taken.has(s.slug))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus /> Add a skill
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder="Search skills" aria-label="Search skills" />
          <CommandList>
            {catalogue.isLoading && (
              <p className="px-3 py-4 text-sm text-text-muted">Loading skills</p>
            )}
            {catalogue.isError && (
              <p role="alert" className="px-3 py-4 text-sm text-danger">
                Skills could not be loaded. Close this and try again.
              </p>
            )}
            <CommandEmpty>No skills match your search.</CommandEmpty>
            {groupByCategory(available).map(([category, skills]) => (
              <CommandGroup key={category} heading={category}>
                {skills.map((skill) => (
                  <CommandItem
                    key={skill.slug}
                    value={`${skill.name} ${category}`}
                    onSelect={() => {
                      onAdd({ slug: skill.slug, name: skill.name, category: skill.category })
                      setOpen(false)
                    }}
                  >
                    {skill.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
