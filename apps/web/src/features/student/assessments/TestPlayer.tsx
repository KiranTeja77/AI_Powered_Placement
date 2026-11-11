import { ChevronLeft, ChevronRight, Flag, Timer } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { AssessmentQuestion } from '@/lib/api/student-types'
import { cn } from '@/lib/utils'
import { formatClock } from '../common/format'
import { FullscreenWarning, MonitoringBanner } from './MonitoringBanner'
import { QuestionPalette } from './QuestionPalette'
import { SubmitDialog } from './SubmitDialog'
import { useCountdown } from './useCountdown'
import { useFullscreen } from './useFullscreen'

export interface TestPlayerProps {
  title: string
  durationSeconds: number
  questions: AssessmentQuestion[]
  /** Warn when the student is not in full screen. Off where full screen was never requested. */
  expectFullscreen?: boolean
  onSubmit: (answers: Record<string, string>) => void
}

/** The timed question screen: palette, review marks, timer, monitoring notice and submit. */
export function TestPlayer({
  title,
  durationSeconds,
  questions,
  expectFullscreen = false,
  onSubmit,
}: TestPlayerProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const fullscreen = useFullscreen()

  const submit = useCallback(() => {
    setConfirming(false)
    onSubmit(answers)
  }, [answers, onSubmit])
  const left = useCountdown(durationSeconds, submit)

  const question = questions[index]!
  const answered = useMemo(() => new Set(Object.keys(answers)), [answers])
  const isFlagged = flagged.has(question.id)
  const lowTime = left <= 300

  const toggleFlag = () =>
    setFlagged((prev) => {
      const next = new Set(prev)
      if (next.has(question.id)) next.delete(question.id)
      else next.add(question.id)
      return next
    })
  const clearAnswer = () =>
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[question.id]
      return next
    })

  return (
    <div className="max-w-5xl space-y-3">
      <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg px-1 py-2">
        <h1 className="min-w-0 truncate text-lg font-semibold text-text">{title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            Question {index + 1} of {questions.length}
          </span>
          <span
            role="timer"
            aria-label={`Time left ${formatClock(left)}`}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-base font-medium tabular-nums',
              lowTime ? 'border-danger text-danger' : 'border-border text-text',
            )}
          >
            <Timer className="size-4" aria-hidden="true" />
            {formatClock(left)}
          </span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {left === 300 ? 'Five minutes left.' : left === 60 ? 'One minute left.' : ''}
      </p>

      <MonitoringBanner />
      {expectFullscreen && fullscreen.supported && !fullscreen.active && (
        <FullscreenWarning onReturn={() => void fullscreen.enter()} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section
          aria-label={`Question ${index + 1}`}
          className="rounded-md border border-border bg-surface"
        >
          <div className="space-y-4 p-4">
            <p id="question-prompt" className="text-base font-medium text-text">
              {question.prompt}
            </p>
            <RadioGroup
              aria-labelledby="question-prompt"
              value={answers[question.id] ?? ''}
              onValueChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            >
              {question.options.map((option, i) => {
                const id = `option-${question.id}-${i}`
                return (
                  <div key={option} className="flex items-center gap-2">
                    <RadioGroupItem id={id} value={option} />
                    <Label htmlFor={id} className="font-normal">
                      {option}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" aria-pressed={isFlagged} onClick={toggleFlag}>
                <Flag className={isFlagged ? 'fill-warning text-warning' : undefined} />
                {isFlagged ? 'Marked for review' : 'Mark for review'}
              </Button>
              {answers[question.id] !== undefined && (
                <Button variant="ghost" size="sm" onClick={clearAnswer}>
                  Clear answer
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            <Button
              variant="secondary"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ChevronLeft /> Previous
            </Button>
            {index < questions.length - 1 ? (
              <Button variant="secondary" onClick={() => setIndex((i) => i + 1)}>
                Next <ChevronRight />
              </Button>
            ) : (
              <Button onClick={() => setConfirming(true)}>Review and submit</Button>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <QuestionPalette
            ids={questions.map((q) => q.id)}
            current={index}
            answered={answered}
            flagged={flagged}
            onGo={setIndex}
          />
          <Button className="w-full" onClick={() => setConfirming(true)}>
            Submit assessment
          </Button>
        </aside>
      </div>

      <SubmitDialog
        open={confirming}
        onOpenChange={setConfirming}
        answered={answered.size}
        flagged={flagged.size}
        total={questions.length}
        onConfirm={submit}
      />
    </div>
  )
}
