import { useCallback, useMemo, useState } from 'react'
import type { AnalysisDetail, SkillEditsInput } from '@/lib/api/resume-types'

export interface AddedSkill {
  slug: string
  name: string
  category: string
}

interface EditState {
  confirmed: string[]
  removed: string[]
  added: AddedSkill[]
}

const sameMembers = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value) => b.includes(value))

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/**
 * The student's pending changes to the skill list. They start from what is already saved and are
 * sent to the API as a whole (confirmed, removed and added), relative to the analyzer's answer.
 */
export function useSkillEdits(detail: AnalysisDetail) {
  const saved = useMemo<EditState>(
    () => ({
      confirmed: detail.edits?.confirmedSkillIds ?? [],
      removed: detail.edits?.removedSkillIds ?? [],
      added: (detail.edits?.addedSkillIds ?? []).map((slug) => {
        const skill = detail.effective.skills.find((s) => s.id === slug)
        return { slug, name: skill?.name ?? slug, category: skill?.category ?? '' }
      }),
    }),
    [detail],
  )
  const [state, setState] = useState<EditState>(saved)

  const dirty =
    !sameMembers(state.confirmed, saved.confirmed) ||
    !sameMembers(state.removed, saved.removed) ||
    !sameMembers(
      state.added.map((s) => s.slug),
      saved.added.map((s) => s.slug),
    )

  const toggleConfirm = useCallback(
    (id: string) => setState((s) => ({ ...s, confirmed: toggle(s.confirmed, id) })),
    [],
  )
  const toggleRemove = useCallback(
    (id: string) => setState((s) => ({ ...s, removed: toggle(s.removed, id) })),
    [],
  )
  const addSkill = useCallback(
    (skill: AddedSkill) =>
      setState((s) =>
        s.added.some((a) => a.slug === skill.slug) ? s : { ...s, added: [...s.added, skill] },
      ),
    [],
  )
  const removeAdded = useCallback(
    (slug: string) => setState((s) => ({ ...s, added: s.added.filter((a) => a.slug !== slug) })),
    [],
  )
  const discard = useCallback(() => setState(saved), [saved])

  const payload: SkillEditsInput = {
    confirmedSkillIds: state.confirmed,
    removedSkillIds: state.removed,
    addedSkillIds: state.added.map((s) => s.slug),
  }
  const hasSavedEdits = detail.edits !== null

  return {
    state,
    saved,
    dirty,
    hasSavedEdits,
    payload,
    toggleConfirm,
    toggleRemove,
    addSkill,
    removeAdded,
    discard,
  }
}

export type SkillEditing = ReturnType<typeof useSkillEdits>
