import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import type { ResumeSkill } from '@/lib/api/resume-types'
import { AddSkillPicker } from './AddSkillPicker'
import { pluralize } from './format'
import { SkillRow } from './SkillRow'
import type { SkillEditing } from './useSkillEdits'

interface SkillsPanelProps {
  skills: ResumeSkill[]
  editing: SkillEditing
}

function byCategory(skills: ResumeSkill[]): [string, ResumeSkill[]][] {
  const groups = new Map<string, ResumeSkill[]>()
  for (const skill of skills)
    groups.set(skill.category, [...(groups.get(skill.category) ?? []), skill])
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, list]) => [
      category,
      // Skills found come before possible matches, then alphabetical.
      list.sort(
        (a, b) =>
          Number(a.status === 'possible') - Number(b.status === 'possible') ||
          a.name.localeCompare(b.name),
      ),
    ])
}

/** Every skill found, grouped by category, with the words it came from and edit actions. */
export function SkillsPanel({ skills, editing }: SkillsPanelProps) {
  const found = skills.filter((s) => s.status === 'detected').length
  const possible = skills.length - found
  const taken = new Set([...skills.map((s) => s.id), ...editing.state.added.map((a) => a.slug)])

  return (
    <section aria-labelledby="skills-heading" className="space-y-3">
      <div className="flex max-w-4xl flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="skills-heading" className="text-md font-semibold text-text">
            Skills in your resume
          </h2>
          <p className="text-base text-text-muted">
            {pluralize(found, 'skill')} found
            {possible > 0
              ? `, ${pluralize(possible, 'possible match', 'possible matches')} to confirm`
              : ''}
            . Each one shows the words it came from.
          </p>
        </div>
        <AddSkillPicker taken={taken} onAdd={editing.addSkill} />
      </div>

      {skills.length === 0 && editing.state.added.length === 0 && (
        <p className="rounded-md border border-border bg-surface px-4 py-6 text-base text-text-muted">
          No known skills were found in this text. Check that you pasted your resume as plain text,
          or add skills yourself.
        </p>
      )}

      {(editing.state.added.length > 0 || skills.length > 0) && (
        <div className="max-w-4xl divide-y divide-border rounded-md border border-border bg-surface">
          {editing.state.added.length > 0 && (
            <div>
              <h3 className="bg-surface-muted px-4 py-1.5 text-sm font-medium text-text-muted">
                Added by you
              </h3>
              <ul className="px-4">
                {editing.state.added.map((skill) => (
                  <li
                    key={skill.slug}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-3 last:border-b-0"
                  >
                    <span className="text-base font-medium text-text">{skill.name}</span>
                    <StatusBadge
                      tone="neutral"
                      label={
                        editing.saved.added.some((a) => a.slug === skill.slug)
                          ? 'Added by you'
                          : 'Added, not saved'
                      }
                    />
                    <span className="text-sm text-text-muted">
                      Counts as listed: no evidence in the text
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => editing.removeAdded(skill.slug)}
                    >
                      Undo<span className="sr-only"> adding {skill.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {byCategory(skills).map(([category, list]) => (
            <div key={category}>
              <h3 className="bg-surface-muted px-4 py-1.5 text-sm font-medium text-text-muted">
                {category}
              </h3>
              <ul className="px-4">
                {list.map((skill) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    removed={editing.state.removed.includes(skill.id)}
                    removedSaved={editing.saved.removed.includes(skill.id)}
                    confirmed={editing.state.confirmed.includes(skill.id)}
                    confirmedSaved={editing.saved.confirmed.includes(skill.id)}
                    onToggleRemove={() => editing.toggleRemove(skill.id)}
                    onToggleConfirm={() => editing.toggleConfirm(skill.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
