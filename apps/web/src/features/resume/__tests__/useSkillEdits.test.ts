import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSkillEdits } from '../useSkillEdits'
import { makeDetail } from './support'

describe('useSkillEdits', () => {
  it('starts clean when nothing has been saved', () => {
    const { result } = renderHook(() => useSkillEdits(makeDetail()))
    expect(result.current.dirty).toBe(false)
    expect(result.current.hasSavedEdits).toBe(false)
    expect(result.current.payload).toEqual({
      confirmedSkillIds: [],
      removedSkillIds: [],
      addedSkillIds: [],
    })
  })

  it('tracks confirm, remove and add, and sends them as one payload', () => {
    const { result } = renderHook(() => useSkillEdits(makeDetail()))
    act(() => result.current.toggleConfirm('kubernetes'))
    act(() => result.current.toggleRemove('python'))
    act(() =>
      result.current.addSkill({
        slug: 'typescript',
        name: 'TypeScript',
        category: 'Programming languages',
      }),
    )

    expect(result.current.dirty).toBe(true)
    expect(result.current.payload).toEqual({
      confirmedSkillIds: ['kubernetes'],
      removedSkillIds: ['python'],
      addedSkillIds: ['typescript'],
    })
  })

  it('is clean again when a change is undone', () => {
    const { result } = renderHook(() => useSkillEdits(makeDetail()))
    act(() => result.current.toggleRemove('python'))
    expect(result.current.dirty).toBe(true)
    act(() => result.current.toggleRemove('python'))
    expect(result.current.dirty).toBe(false)
  })

  it('does not add the same skill twice', () => {
    const { result } = renderHook(() => useSkillEdits(makeDetail()))
    const skill = { slug: 'typescript', name: 'TypeScript', category: 'Programming languages' }
    act(() => result.current.addSkill(skill))
    act(() => result.current.addSkill(skill))
    expect(result.current.state.added).toHaveLength(1)
  })

  it('starts from the saved edits and treats them as not pending', () => {
    const detail = makeDetail({
      edits: {
        confirmedSkillIds: ['kubernetes'],
        removedSkillIds: [],
        addedSkillIds: ['typescript'],
        updatedAt: '2026-11-11T06:00:00Z',
      },
    })
    detail.effective.skills.push({
      id: 'typescript',
      name: 'TypeScript',
      category: 'Programming languages',
      strength: 0.5,
      grade: 'listed',
      source: 'added',
    })
    const { result } = renderHook(() => useSkillEdits(detail))
    expect(result.current.hasSavedEdits).toBe(true)
    expect(result.current.dirty).toBe(false)
    expect(result.current.state.added[0]?.name).toBe('TypeScript')

    act(() => result.current.removeAdded('typescript'))
    expect(result.current.dirty).toBe(true)
    act(() => result.current.discard())
    expect(result.current.dirty).toBe(false)
    expect(result.current.state.added).toHaveLength(1)
  })

  it('removing every edit is a change, so the student can reset a saved analysis', () => {
    const detail = makeDetail({
      edits: {
        confirmedSkillIds: ['kubernetes'],
        removedSkillIds: [],
        addedSkillIds: [],
        updatedAt: '2026-11-11T06:00:00Z',
      },
    })
    const { result } = renderHook(() => useSkillEdits(detail))
    act(() => result.current.toggleConfirm('kubernetes'))
    expect(result.current.dirty).toBe(true)
    expect(result.current.payload.confirmedSkillIds).toEqual([])
  })
})
