import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '@/lib/api/auth-api'
import { renderScreen } from '@/features/student/__tests__/testing'
import AssessmentBuilderPage from '../assessments/AssessmentBuilderPage'
import { assessmentSchema } from '../assessments/schemas'
import FacultyOverviewPage from '../overview/FacultyOverviewPage'
import MentoringPage from '../mentoring/MentoringPage'
import { noteSchema } from '../mentoring/schemas'
import ProctoringPage from '../proctoring/ProctoringPage'
import { ReviewPanel } from '../proctoring/ReviewPanel'
import { reviewSchema } from '../proctoring/reviewSchema'
import QuestionFormPage from '../questions/QuestionFormPage'
import QuestionsPage from '../questions/QuestionsPage'
import { questionSchema, type QuestionValues } from '../questions/schemas'
import Student360Page from '../students/Student360Page'
import StudentsPage from '../students/StudentsPage'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/auth-api', () => ({ authApi: { departments: vi.fn() } }))

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  toast.mockClear()
  vi.mocked(authApi.departments).mockResolvedValue([
    { id: 'd1', code: 'CSE', name: 'Computer Science' },
  ])
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe.each([
  ['overview', <FacultyOverviewPage />, 'No students need attention'],
  ['students', <StudentsPage />, 'No students assigned yet'],
  ['mentoring', <MentoringPage />, 'No mentoring notes yet'],
  ['question bank', <QuestionsPage />, 'No questions yet'],
  ['proctoring', <ProctoringPage />, 'Nothing to review'],
])('%s', (_name, page, title) => {
  it(`shows "${title}" without calling the network`, () => {
    renderScreen(page)
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('faculty pages', () => {
  it('overview shows dashes in the stat cards', () => {
    renderScreen(<FacultyOverviewPage />)
    expect(screen.getByLabelText('Average latest score: no data')).toHaveTextContent('—')
    expect(screen.getByLabelText('Awaiting review: no data')).toHaveTextContent('—')
    expect(screen.getByText('No recent results')).toBeInTheDocument()
    expect(screen.getByText('No follow-ups due')).toBeInTheDocument()
  })

  it('student 360 says when the student cannot be found', () => {
    renderScreen(<Student360Page />, { route: '/f/students/x', path: '/f/students/:id' })
    expect(screen.getByText('Student not found')).toBeInTheDocument()
  })

  it('proctoring always carries the signals note, and asks for a selection', () => {
    renderScreen(<ProctoringPage />)
    expect(screen.getByRole('note')).toHaveTextContent(
      'Alerts are signals for review, not proof of misconduct.',
    )
    expect(screen.getByText('Select an attempt')).toBeInTheDocument()
  })

  it('editing an unknown question is not found, creating one shows the form', () => {
    const { unmount } = renderScreen(<QuestionFormPage />, {
      route: '/f/questions/x',
      path: '/f/questions/:id',
    })
    expect(screen.getByText('Question not found')).toBeInTheDocument()
    unmount()
    renderScreen(<QuestionFormPage />, { route: '/f/questions/new', path: '/f/questions/new' })
    expect(screen.getByRole('button', { name: 'Save question' })).toBeInTheDocument()
  })
})

const validMcq: QuestionValues = {
  type: 'mcq_single',
  text: 'Which structure has O(1) lookup?',
  topic: 'Data structures',
  departmentId: 'd1',
  difficulty: 'easy',
  marks: '2',
  explanation: 'A hash table maps keys to buckets.',
  options: [
    { text: 'List', correct: false },
    { text: 'Hash table', correct: true },
  ],
  numericAnswer: '',
  tolerance: '',
  acceptedAnswers: '',
  testCases: [],
}

const issues = (v: unknown) => {
  const r = questionSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

describe('questionSchema', () => {
  it('accepts a valid single-answer question', () => {
    expect(issues(validMcq)).toEqual([])
  })

  it('needs exactly one correct option for single, at least one for multiple', () => {
    const none = { ...validMcq, options: validMcq.options.map((o) => ({ ...o, correct: false })) }
    expect(issues(none)).toContain('options: Mark exactly one correct option')
    expect(issues({ ...none, type: 'mcq_multi' })).toContain(
      'options: Mark at least one correct option',
    )
    const two = { ...validMcq, options: validMcq.options.map((o) => ({ ...o, correct: true })) }
    expect(issues(two)).toContain('options: Mark exactly one correct option')
    expect(issues({ ...two, type: 'mcq_multi' })).toEqual([])
  })

  it('rejects empty and duplicate options', () => {
    const blank = { ...validMcq, options: [validMcq.options[0]!, { text: ' ', correct: false }] }
    expect(issues(blank)).toContain('options.1.text: Enter the option text')
    const same = { ...validMcq, options: [validMcq.options[0]!, { text: 'list', correct: true }] }
    expect(issues(same)).toContain('options: Options must be different')
  })

  it('checks numeric, short and coding answers', () => {
    expect(issues({ ...validMcq, type: 'numeric', numericAnswer: 'abc' })).toContain(
      'numericAnswer: Enter the correct number',
    )
    expect(
      issues({ ...validMcq, type: 'numeric', numericAnswer: '3.5', tolerance: '-1' }),
    ).toContain('tolerance: Tolerance must be 0 or more')
    expect(
      issues({ ...validMcq, type: 'numeric', numericAnswer: '3.5', tolerance: '0.1' }),
    ).toEqual([])
    expect(issues({ ...validMcq, type: 'short', acceptedAnswers: ' \n ' })).toContain(
      'acceptedAnswers: Enter at least one accepted answer',
    )
    expect(issues({ ...validMcq, type: 'coding', testCases: [] })).toContain(
      'testCases: Add at least one test case',
    )
    expect(
      issues({ ...validMcq, type: 'coding', testCases: [{ input: '1', expected: '' }] }),
    ).toContain('testCases.0.expected: Enter the expected output')
  })

  it('bounds the marks', () => {
    expect(issues({ ...validMcq, marks: '0' })).toContain('marks: Marks must be more than 0')
    expect(issues({ ...validMcq, marks: '101' })).toContain('marks: Marks cannot be more than 100')
    expect(issues({ ...validMcq, marks: '' })).toContain('marks: Enter the marks, for example 2')
  })
})

describe('other schemas', () => {
  const sec = { id: 's1', name: 'Aptitude' }
  const base = {
    title: 'Placement mock 1',
    track: 'technical',
    departmentId: 'd1',
    durationMinutes: '60',
    totalMarks: '100',
    startsAt: '2026-12-01T10:00',
    endsAt: '2026-12-01T12:00',
    sections: [sec],
    questions: [],
    fullScreenRequired: true,
    tabSwitchLogging: true,
    cameraRequired: false,
    microphoneRequired: false,
    warningThreshold: '3',
  }

  it('assessment: window must close after it opens, sections need distinct names', () => {
    expect(assessmentSchema.safeParse(base).success).toBe(true)
    expect(assessmentSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false)
    expect(
      assessmentSchema.safeParse({ ...base, sections: [sec, { id: 's2', name: 'aptitude' }] })
        .success,
    ).toBe(false)
    expect(assessmentSchema.safeParse({ ...base, durationMinutes: '2' }).success).toBe(false)
    expect(assessmentSchema.safeParse({ ...base, warningThreshold: '11' }).success).toBe(false)
  })

  it('review: notes are required unless there is no issue', () => {
    expect(reviewSchema.safeParse({ outcome: 'no_issue', notes: '' }).success).toBe(true)
    expect(reviewSchema.safeParse({ outcome: 'escalate', notes: 'short' }).success).toBe(false)
    expect(
      reviewSchema.safeParse({ outcome: 'escalate', notes: 'Left the tab three times.' }).success,
    ).toBe(true)
  })

  it('note: needs a roll number and text, and no past follow-up date', () => {
    const ok = { studentRollNo: '21CS001', note: 'Met today', assignedPractice: '', followUpOn: '' }
    expect(noteSchema.safeParse(ok).success).toBe(true)
    expect(noteSchema.safeParse({ ...ok, studentRollNo: '!' }).success).toBe(false)
    expect(noteSchema.safeParse({ ...ok, followUpOn: '2020-01-01' }).success).toBe(false)
  })
})

describe('mentoring note dialog', () => {
  it('validates, then says saving is not available', async () => {
    renderScreen(<MentoringPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a mentoring note' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save note' }))
    expect(await within(dialog).findByText(/Enter the student roll number/)).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText('Student roll number'), '21CS001')
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Discussed SQL joins')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save note' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })
})

describe('review panel', () => {
  const attempt = {
    id: 'a',
    studentName: 'Sample Student',
    rollNo: '21CS1',
    assessmentTitle: 'Sample test',
    eventCount: 1,
    status: 'pending' as const,
  }

  it('lists events and requires notes for anything but no issue', async () => {
    renderScreen(
      <ReviewPanel
        attempt={attempt}
        events={[
          { id: 'e', type: 'Left full screen', at: '2026-11-10T10:00:00Z', durationSeconds: 65 },
        ]}
      />,
    )
    expect(screen.getByText('Left full screen')).toBeInTheDocument()
    expect(screen.getByText(/1:05/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save review' }))
    expect(await screen.findByText('Choose an outcome')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Escalate/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }))
    expect(await screen.findByText(/Write what you saw and why/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /No issue/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })

  it('shows an empty state when an attempt has no events', () => {
    renderScreen(<ReviewPanel attempt={attempt} events={[]} />)
    expect(screen.getByText('No events recorded')).toBeInTheDocument()
  })
})

describe('assessment builder', () => {
  it('reorders sections and refuses to publish an invalid form', async () => {
    renderScreen(<AssessmentBuilderPage />)
    await userEvent.type(screen.getByLabelText('Section 1 name'), 'Aptitude')
    await userEvent.click(screen.getByRole('button', { name: 'Add section' }))
    await userEvent.type(screen.getByLabelText('Section 2 name'), 'Core CS')
    await userEvent.click(screen.getByRole('button', { name: 'Move section 2 up' }))
    expect(screen.getByLabelText('Section 1 name')).toHaveValue('Core CS')
    expect(screen.getByLabelText('Section 2 name')).toHaveValue('Aptitude')
    expect(screen.getByRole('button', { name: 'Move section 1 up' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('Enter a title of at least 3 characters')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
  })

  it('previews an unfinished assessment', async () => {
    renderScreen(<AssessmentBuilderPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    const dialog = await screen.findByRole('dialog', { name: 'Untitled assessment' })
    expect(dialog).toHaveTextContent('This assessment has no questions yet')
    expect(dialog).toHaveTextContent('Full screenRequired')
  })

  it('explains every proctoring setting', () => {
    renderScreen(<AssessmentBuilderPage />)
    expect(screen.getByText(/Students must enter full screen to start/)).toBeInTheDocument()
    expect(screen.getByText(/Records when a student leaves the test tab/)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Require camera' })).not.toBeChecked()
    expect(
      screen.getByText(/Alerts are signals for review, not proof of misconduct/),
    ).toBeInTheDocument()
  })
})
