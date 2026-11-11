import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ResumeSkill, SkillGrade } from '@/lib/api/resume-types'
import { EvidenceSnippet } from './EvidenceSnippet'
import { pluralize } from './format'
import { GRADE } from './labels'

interface SkillRowProps {
  skill: ResumeSkill
  /** The student has marked this skill to be removed. */
  removed: boolean
  /** The removal is already saved (otherwise it is still pending). */
  removedSaved: boolean
  /** The student has marked this possible match as confirmed. */
  confirmed: boolean
  /** The confirmation is already saved (otherwise it is still pending). */
  confirmedSaved: boolean
  onToggleRemove: () => void
  onToggleConfirm: () => void
}

/** One skill with its badges, the words it came from, and the action the student can take. */
export function SkillRow({
  skill,
  removed,
  removedSaved,
  confirmed,
  confirmedSaved,
  onToggleRemove,
  onToggleConfirm,
}: SkillRowProps) {
  const possible = skill.status === 'possible'
  const [first, ...rest] = skill.evidence

  return (
    <li className="space-y-1.5 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-medium text-text">{skill.name}</span>
        {possible ? (
          <StatusBadge
            tone="warning"
            label={
              confirmed
                ? confirmedSaved
                  ? 'Confirmed by you'
                  : 'Confirmed, not saved'
                : `Possible, ${Math.round(skill.similarity ?? 0)}% similar`
            }
          />
        ) : (
          <StatusBadge
            tone={removed ? 'neutral' : GRADE[skill.grade as SkillGrade].tone}
            label={
              removed
                ? removedSaved
                  ? 'Removed by you'
                  : 'Removed, not saved'
                : GRADE[skill.grade as SkillGrade].label
            }
          />
        )}
        {skill.mentionCount > 1 && (
          <Badge variant="outline">{pluralize(skill.mentionCount, 'mention')}</Badge>
        )}
        <div className="ml-auto">
          {possible ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleConfirm}
              aria-pressed={confirmed}
            >
              {confirmed ? 'Undo' : 'Confirm'}
              <span className="sr-only"> {skill.name}</span>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onToggleRemove} aria-pressed={removed}>
              {removed ? 'Undo' : 'Remove'}
              <span className="sr-only"> {skill.name}</span>
            </Button>
          )}
        </div>
      </div>
      {first && <EvidenceSnippet evidence={first} />}
      {rest.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">
            {skill.mentionCount > skill.evidence.length
              ? `Show ${rest.length} more of ${skill.mentionCount} mentions`
              : `Show ${pluralize(rest.length, 'more mention')}`}
          </summary>
          <div className="mt-1 space-y-1">
            {rest.map((evidence) => (
              <EvidenceSnippet key={evidence.start} evidence={evidence} />
            ))}
          </div>
        </details>
      )}
    </li>
  )
}
