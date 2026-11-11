import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentQuestion } from '@/lib/api/student-types'
import { TestPlayer } from '../assessments/TestPlayer'

const fullscreen = vi.hoisted(() => ({ value: { supported: true, active: true, error: null } }))
vi.mock('../assessments/useFullscreen', () => ({
  useFullscreen: () => ({ ...fullscreen.value, enter: vi.fn(), exit: vi.fn() }),
}))

const QUESTIONS: AssessmentQuestion[] = [
  { id: 'a', prompt: 'First question?', options: ['One', 'Two'] },
  { id: 'b', prompt: 'Second question?', options: ['Red', 'Blue'] },
  { id: 'c', prompt: 'Third question?', options: ['Yes', 'No'] },
]

function setup(props: Partial<React.ComponentProps<typeof TestPlayer>> = {}) {
  const onSubmit = vi.fn()
  render(
    <TestPlayer
      title="Practice test"
      durationSeconds={600}
      questions={QUESTIONS}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit }
}

beforeEach(() => {
  fullscreen.value = { supported: true, active: true, error: null }
})
afterEach(() => vi.useRealTimers())

describe('TestPlayer', () => {
  it('shows the question, the timer and the monitoring notice', () => {
    setup()
    expect(screen.getByText('First question?')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('10:00')
    expect(screen.getByRole('note')).toHaveTextContent('Alerts are for review, not proof')
  })

  it('moves with Previous and Next and from the palette', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Second question?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Question 3/ }))
    expect(screen.getByText('Third question?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review and submit' })).toBeInTheDocument()
  })

  it('marks a question answered in the palette, and can clear the answer', async () => {
    setup()
    const palette = screen.getByRole('navigation', { name: 'Question palette' })
    expect(within(palette).getByRole('button', { name: /^Question 1, not answered/ })).toBeVisible()
    await userEvent.click(screen.getByRole('radio', { name: 'Two' }))
    expect(within(palette).getByRole('button', { name: /^Question 1, answered/ })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Clear answer' }))
    expect(within(palette).getByRole('button', { name: /^Question 1, not answered/ })).toBeVisible()
  })

  it('marks a question for review and says so in the palette', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Mark for review' }))
    expect(screen.getByRole('button', { name: 'Marked for review' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByRole('button', { name: /^Question 1, not answered, marked for review/ }),
    ).toBeVisible()
  })

  it('asks before submitting, reports what is open, and submits the answers', async () => {
    const { onSubmit } = setup()
    await userEvent.click(screen.getByRole('radio', { name: 'One' }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit assessment' }))
    const dialog = await screen.findByRole('dialog', { name: 'Submit this assessment' })
    expect(dialog).toHaveTextContent('1 of 3 questions answered')
    expect(dialog).toHaveTextContent('2 not answered')
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep working' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Submit assessment' }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit assessment' }),
    )
    expect(onSubmit).toHaveBeenCalledWith({ a: 'One' })
  })

  it('submits by itself when time runs out', () => {
    vi.useFakeTimers()
    const { onSubmit } = setup({ durationSeconds: 3 })
    expect(screen.getByRole('timer')).toHaveTextContent('0:03')
    act(() => void vi.advanceTimersByTime(3100))
    expect(screen.getByRole('timer')).toHaveTextContent('0:00')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(5000))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('warns when full screen is left, only where it was asked for', () => {
    fullscreen.value = { supported: true, active: false, error: null }
    const { unmount } = render(
      <TestPlayer title="t" durationSeconds={60} questions={QUESTIONS} onSubmit={vi.fn()} />,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    unmount()

    render(
      <TestPlayer
        title="t"
        durationSeconds={60}
        questions={QUESTIONS}
        expectFullscreen
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('You left full screen')
    expect(screen.getByRole('button', { name: 'Return to full screen' })).toBeInTheDocument()
  })
})
