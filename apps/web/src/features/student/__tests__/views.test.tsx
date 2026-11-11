import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AttemptResult,
  Drive,
  Lesson,
  TrainingGroup,
  WeeklyTask,
} from '@/lib/api/student-types'
import { DriveDetailView } from '../drives/DriveDetailView'
import { ResultView } from '../results/ResultView'
import { RoadmapView } from '../roadmap/RoadmapView'
import { LessonView } from '../training/LessonView'
import { TrackView } from '../training/TrackView'
import { renderScreen } from './testing'

const toast = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast }))
beforeEach(() => toast.mockClear())

// Small typed values used only by these tests.
const TASKS: WeeklyTask[] = [
  {
    id: '1',
    title: 'Practise joins',
    priority: 'high',
    reason: 'A gap in SQL',
    estimatedMinutes: 45,
    done: false,
  },
  {
    id: '2',
    title: 'Read hashing',
    priority: 'low',
    reason: 'Core for backend',
    estimatedMinutes: 90,
    done: true,
  },
]

describe('RoadmapView', () => {
  it('shows priority, reason and time on every row and reports a toggle', async () => {
    const onToggle = vi.fn()
    renderScreen(<RoadmapView tasks={TASKS} onToggle={onToggle} />)
    const first = screen.getByRole('checkbox', { name: 'Practise joins' })
    expect(first).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Read hashing' })).toBeChecked()
    expect(screen.getByText('High priority')).toBeInTheDocument()
    expect(screen.getByText(/A gap in SQL/)).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
    expect(screen.getByText('1 h 30 min')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 done/)).toBeInTheDocument()
    await userEvent.click(first)
    expect(onToggle).toHaveBeenCalledWith(TASKS[0], true)
  })

  it('has loading, empty and error states', async () => {
    const { unmount } = renderScreen(<RoadmapView tasks={[]} loading onToggle={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'Loading plan' })).toBeInTheDocument()
    unmount()
    const empty = renderScreen(<RoadmapView tasks={[]} onToggle={vi.fn()} />)
    expect(screen.getByText('No plan for this week')).toBeInTheDocument()
    empty.unmount()
    const onRetry = vi.fn()
    renderScreen(<RoadmapView tasks={[]} error onRetry={onRetry} onToggle={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
  })
})

const GROUPS: TrainingGroup[] = [
  {
    name: 'Computer science',
    topics: [
      {
        id: 'ds',
        title: 'Data structures',
        lessons: [
          { id: 'l1', title: 'Arrays', done: true },
          { id: 'l2', title: 'Hash tables', done: false },
        ],
      },
      { id: 'os', title: 'Operating systems', lessons: [] },
    ],
  },
]

describe('TrackView', () => {
  it('groups topics, shows progress and links to the next lesson', () => {
    renderScreen(<TrackView groups={GROUPS} kind="technical" />)
    expect(screen.getByRole('heading', { name: 'Computer science' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Data structures progress' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    )
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute(
      'href',
      '/s/training/ds/l2',
    )
    expect(screen.getByText('No lessons yet')).toBeInTheDocument()
  })

  it('filters by search', async () => {
    renderScreen(<TrackView groups={GROUPS} kind="technical" />)
    await userEvent.type(screen.getByLabelText('Search topics'), 'zzz')
    expect(screen.getByText('No topics match your search.')).toBeInTheDocument()
  })
})

const LESSON: Lesson = {
  id: 'l2',
  topicId: 'ds',
  topicTitle: 'Data structures',
  title: 'Hash tables',
  sections: [{ heading: 'Idea', paragraphs: ['Keys are hashed to buckets.'] }],
  practice: [
    {
      id: 'p1',
      prompt: 'Average lookup cost?',
      options: ['O(1)', 'O(n)'],
      hints: ['Think of buckets.', 'No scanning.'],
    },
  ],
}

describe('LessonView', () => {
  it('reveals hints one at a time', async () => {
    renderScreen(<LessonView lesson={LESSON} trackPath="/s/training/technical" />)
    expect(screen.getByText('Keys are hashed to buckets.')).toBeInTheDocument()
    expect(screen.queryByText(/Think of buckets/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show a hint' }))
    expect(screen.getByText(/Think of buckets/)).toBeInTheDocument()
    expect(screen.queryByText(/No scanning/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show another hint' }))
    expect(screen.getByText(/No scanning/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hint/ })).not.toBeInTheDocument()
  })
})

const RESULT: AttemptResult = {
  attemptId: 'a1',
  assessmentTitle: 'Core test',
  score: 4,
  maxScore: 6,
  timeSpentSeconds: 1260,
  topics: [{ topic: 'Databases', correct: 1, total: 2 }],
  answers: [
    {
      questionId: 'q1',
      prompt: 'Q one',
      yourAnswer: 'A',
      correctAnswer: 'A',
      correct: true,
      explanation: 'Because.',
    },
    {
      questionId: 'q2',
      prompt: 'Q two',
      yourAnswer: 'B',
      correctAnswer: 'C',
      correct: false,
      explanation: 'Since.',
    },
    {
      questionId: 'q3',
      prompt: 'Q three',
      yourAnswer: null,
      correctAnswer: 'D',
      correct: false,
      explanation: 'Hence.',
    },
  ],
  recommended: [{ topic: 'Databases', reason: 'One wrong.', to: '/s/training/technical' }],
}

describe('ResultView', () => {
  it('shows score, accuracy of answered questions, time and per-answer status', () => {
    renderScreen(<ResultView result={RESULT} />)
    expect(screen.getByText('4 of 6')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('21:00')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Databases accuracy' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    )
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(screen.getByText('Not answered')).toBeInTheDocument()
    expect(screen.getAllByText('Correct answer:', { exact: false })).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Practise/ })).toHaveAttribute(
      'href',
      '/s/training/technical',
    )
  })

  it('shows an em dash for accuracy when nothing was answered', () => {
    renderScreen(<ResultView result={{ ...RESULT, answers: [RESULT.answers[2]!], score: 0 }} />)
    expect(screen.getByLabelText('Accuracy: no data')).toHaveTextContent('—')
  })
})

const DRIVE: Drive = {
  id: 'd1',
  company: 'Acme',
  role: 'Engineer',
  location: 'Pune',
  deadline: '2026-12-05T18:00:00Z',
  summary: 'A drive.',
  criteria: [
    { id: 'c1', label: 'CGPA', requirement: '7.0', yourValue: '8.4', status: 'met' },
    { id: 'c2', label: 'Backlogs', requirement: 'None', yourValue: '1', status: 'not_met' },
    { id: 'c3', label: '10th', requirement: '60%', yourValue: null, status: 'unknown' },
  ],
}

describe('DriveDetailView', () => {
  it('labels each criterion met, not met or unknown and explains unknown', () => {
    renderScreen(<DriveDetailView drive={DRIVE} />)
    const row = (label: string) => screen.getByText(label).closest('li') as HTMLElement
    expect(within(row('CGPA')).getByText('Met')).toBeInTheDocument()
    expect(within(row('Backlogs')).getByText('Not met')).toBeInTheDocument()
    expect(within(row('10th')).getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText(/No record yet/)).toBeInTheDocument()
    expect(screen.getByText('Not eligible')).toBeInTheDocument()
    expect(screen.getByText(/does not mean you do not qualify/)).toBeInTheDocument()
  })

  it('needs consent to apply, and then says saving is not available', async () => {
    renderScreen(<DriveDetailView drive={DRIVE} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply to this drive' }))
    expect(await screen.findByText('Tick the box to agree before applying')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('checkbox', { name: /I agree to share my profile/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply to this drive' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })
})
