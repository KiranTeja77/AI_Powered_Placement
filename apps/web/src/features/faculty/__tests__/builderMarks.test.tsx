import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderScreen } from '@/features/student/__tests__/testing'
import { authApi } from '@/lib/api/auth-api'
import AssessmentBuilderPage from '../assessments/AssessmentBuilderPage'
import { assessmentSchema } from '../assessments/schemas'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/auth-api', () => ({ authApi: { departments: vi.fn() } }))

// The question bank has no backend yet, so this test stands one in to exercise the picker.
vi.mock('@/lib/api/pending', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/pending')>()),
  useQuestionBank: () => ({
    data: [
      {
        id: 'q1',
        text: 'Question one',
        topic: 'DS',
        department: 'CSE',
        difficulty: 'easy',
        type: 'mcq_single',
        marks: 2,
        status: 'approved',
      },
      {
        id: 'q2',
        text: 'Question two',
        topic: 'DS',
        department: 'CSE',
        difficulty: 'easy',
        type: 'mcq_single',
        marks: 3,
        status: 'approved',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: () => undefined,
  }),
}))

beforeEach(() => {
  toast.mockClear()
  vi.mocked(authApi.departments).mockResolvedValue([
    { id: 'd1', code: 'CSE', name: 'Computer Science' },
  ])
})

const base = {
  title: 'Placement mock 1',
  track: 'technical',
  departmentId: 'd1',
  durationMinutes: '60',
  totalMarks: '5',
  startsAt: '2026-12-01T10:00',
  endsAt: '2026-12-01T12:00',
  sections: [{ id: 's1', name: 'Aptitude' }],
  questions: [
    { id: 'q1', text: 'Question one', sectionId: 's1', marks: 2 },
    { id: 'q2', text: 'Question two', sectionId: 's1', marks: 3 },
  ],
  fullScreenRequired: true,
  tabSwitchLogging: true,
  cameraRequired: false,
  microphoneRequired: false,
  warningThreshold: '3',
}

describe('assessment total marks', () => {
  it('must equal the picked questions when there are any', () => {
    expect(assessmentSchema.safeParse(base).success).toBe(true)
    const wrong = assessmentSchema.safeParse({ ...base, totalMarks: '10' })
    expect(wrong.success).toBe(false)
    if (!wrong.success) {
      expect(wrong.error.issues[0]?.path).toEqual(['totalMarks'])
      expect(wrong.error.issues[0]?.message).toBe(
        'Total marks is 10, but the picked questions add up to 5. Change the total or the questions.',
      )
    }
  })

  it('is not checked when no question is picked', () => {
    expect(assessmentSchema.safeParse({ ...base, questions: [], totalMarks: '100' }).success).toBe(
      true,
    )
  })
})

describe('builder with picked questions', () => {
  it('blocks Publish when the total does not match, and says why', async () => {
    renderScreen(<AssessmentBuilderPage />)
    await userEvent.type(screen.getByLabelText('Title'), 'Placement mock 1')
    await userEvent.click(screen.getByRole('combobox', { name: 'Department' }))
    await userEvent.click(await screen.findByRole('option', { name: /CSE/ }))
    await userEvent.type(screen.getByLabelText('Total marks'), '10')
    await userEvent.type(screen.getByLabelText('Window opens'), '2026-12-01T10:00')
    await userEvent.type(screen.getByLabelText('Window closes'), '2026-12-01T12:00')
    await userEvent.type(screen.getByLabelText('Section 1 name'), 'Aptitude')

    await userEvent.click(screen.getByRole('checkbox', { name: /Question one/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Question two/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add selected' }))

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(
      await screen.findByText(/Total marks is 10, but the picked questions add up to 5/),
    ).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()

    // Correct the total and it goes through.
    const total = screen.getByLabelText('Total marks')
    await userEvent.clear(total)
    await userEvent.type(total, '5')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })
})
