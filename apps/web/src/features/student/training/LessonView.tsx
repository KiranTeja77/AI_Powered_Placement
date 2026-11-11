import { Lightbulb } from 'lucide-react'
import { useId, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Lesson, PracticeQuestion } from '@/lib/api/student-types'
import { Section } from '../common/Section'

/** Hints open one at a time, gentlest first, so the student can stop as soon as they are unstuck. */
function Hints({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0)
  if (hints.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      {hints.slice(0, shown).map((hint, i) => (
        <p key={hint} className="flex gap-2 text-sm text-text-muted">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium text-text">Hint {i + 1}.</span> {hint}
          </span>
        </p>
      ))}
      {shown < hints.length && (
        <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + 1)}>
          {shown === 0 ? 'Show a hint' : 'Show another hint'}
        </Button>
      )}
    </div>
  )
}

function Question({ question, number }: { question: PracticeQuestion; number: number }) {
  const group = useId()
  return (
    <li className="px-4 py-4">
      <p id={`${group}-prompt`} className="text-base font-medium text-text">
        {number}. {question.prompt}
      </p>
      <RadioGroup aria-labelledby={`${group}-prompt`} className="mt-2 gap-2">
        {question.options.map((option, i) => {
          const id = `${group}-${i}`
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
      <Hints hints={question.hints} />
    </li>
  )
}

/** One lesson: the reading, then practice questions with hints. */
export function LessonView({ lesson, trackPath }: { lesson: Lesson; trackPath: string }) {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/s' },
          { label: 'Training', to: trackPath },
          { label: lesson.topicTitle },
          { label: lesson.title },
        ]}
        title={lesson.title}
      />
      <div className="max-w-3xl space-y-6">
        <article className="space-y-4">
          {lesson.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-1 text-base font-semibold text-text">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="mb-2 text-base text-text">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
        <Section title="Practice questions" description="Answers are not checked in this version.">
          {lesson.practice.length === 0 ? (
            <p className="px-4 py-6 text-base text-text-muted">
              This lesson has no practice questions.
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {lesson.practice.map((q, i) => (
                <Question key={q.id} question={q} number={i + 1} />
              ))}
            </ol>
          )}
        </Section>
      </div>
    </>
  )
}
