import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AssessmentsPage from '../assessments/AssessmentsPage'
import TakePage from '../assessments/TakePage'
import DrivePage from '../drives/DrivePage'
import DrivesPage from '../drives/DrivesPage'
import FeedbackPage from '../misc/FeedbackPage'
import InterviewsPage from '../misc/InterviewsPage'
import CodingPage from '../practice/CodingPage'
import ProgressPage from '../progress/ProgressPage'
import ResultPage from '../results/ResultPage'
import RoadmapPage from '../roadmap/RoadmapPage'
import LessonPage from '../training/LessonPage'
import TrackPage from '../training/TrackPage'
import { renderScreen } from './testing'

// The editor needs a real browser; the page around it is what is tested here.
vi.mock('../practice/CodeEditor', () => ({
  default: () => <div data-testid="code-editor" />,
}))

const fetchMock = vi.fn()

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

/** Every screen without a backend renders its designed empty state and makes no request. */
describe.each([
  ['roadmap', <RoadmapPage />, 'No plan for this week'],
  ['technical training', <TrackPage kind="technical" />, 'No training yet'],
  ['non-technical training', <TrackPage kind="non-technical" />, 'No training yet'],
  ['assessments', <AssessmentsPage />, 'No upcoming assessments'],
  ['progress', <ProgressPage />, 'No progress to show yet'],
  ['interviews', <InterviewsPage />, 'No interviews scheduled'],
  ['drives', <DrivesPage />, 'No drives yet'],
  ['feedback', <FeedbackPage />, 'No feedback yet'],
])('%s', (_name, page, title) => {
  it(`shows "${title}" and does not call the network`, () => {
    renderScreen(page)
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('screens for a single record', () => {
  it('lesson', () => {
    renderScreen(<LessonPage />, { route: '/s/training/a/b', path: '/s/training/:topic/:lesson' })
    expect(screen.getByText('This lesson is not available yet')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('result', () => {
    renderScreen(<ResultPage />, { route: '/s/results/x', path: '/s/results/:attemptId' })
    expect(screen.getByText('No result to show')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drive', () => {
    renderScreen(<DrivePage />, { route: '/s/drives/x', path: '/s/drives/:id' })
    expect(screen.getByText('Drive not found')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('test with no questions', () => {
    renderScreen(<TakePage />, { route: '/s/assessments/x/take', path: '/s/assessments/:id/take' })
    expect(screen.getByText('This assessment has no questions yet')).toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('coding page shows the editor with empty problem and tests, and disabled Run and Submit', async () => {
    renderScreen(<CodingPage />, { route: '/s/practice/coding/x', path: '/s/practice/coding/:id' })
    expect(screen.getByText('No problem to show')).toBeInTheDocument()
    expect(screen.getByText('No sample tests')).toBeInTheDocument()
    expect(await screen.findByTestId('code-editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Run/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Submit/ })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
