import { zodResolver } from '@hookform/resolvers/zod'
import { MousePointerClick, ShieldCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { EmptyState } from '@/components/EmptyState'
import { Section } from '@/components/Section'
import { TextareaField } from '@/components/TextareaField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ProctorAttempt, ProctorEvent } from '@/lib/api/faculty-types'
import { formatClock, formatDateTime } from '@/lib/format'
import { notifyUnavailable } from '@/lib/notify'
import { OUTCOMES, reviewSchema, type ReviewValues } from './reviewSchema'

function Timeline({ events }: { events: ProctorEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No events recorded"
        description="Events logged during this attempt appear here with the time and how long each lasted."
      />
    )
  }
  return (
    <ol className="divide-y divide-border">
      {events.map((e) => (
        <li key={e.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-base">
          <span className="text-text">{e.type}</span>
          <span className="text-text-muted tabular-nums">
            {formatDateTime(e.at)}
            {e.durationSeconds !== null && `, ${formatClock(e.durationSeconds)}`}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ReviewForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { notes: '' },
  })
  return (
    <form noValidate onSubmit={handleSubmit(notifyUnavailable)} className="grid gap-4 p-4">
      <Controller
        control={control}
        name="outcome"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">Review outcome</legend>
            <RadioGroup value={field.value ?? ''} onValueChange={field.onChange}>
              {OUTCOMES.map((o) => (
                <div key={o.value} className="flex items-start gap-2">
                  <RadioGroupItem id={`outcome-${o.value}`} value={o.value} className="mt-1" />
                  <Label htmlFor={`outcome-${o.value}`} className="grid gap-0.5 font-normal">
                    <span className="font-medium text-text">{o.label}</span>
                    <span className="text-sm text-text-muted">{o.help}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.outcome && <p className="mt-1 text-sm text-danger">{errors.outcome.message}</p>}
          </fieldset>
        )}
      />
      <TextareaField
        label="Notes"
        hint="Required unless there is no issue."
        error={errors.notes?.message}
        {...register('notes')}
      />
      <div>
        <Button type="submit">Save review</Button>
      </div>
    </form>
  )
}

interface ReviewPanelProps {
  attempt: ProctorAttempt | null
  events: ProctorEvent[]
}

/** The selected attempt: its event timeline and the review form. */
export function ReviewPanel({ attempt, events }: ReviewPanelProps) {
  if (!attempt) {
    return (
      <div className="rounded-md border border-border bg-surface">
        <EmptyState
          icon={MousePointerClick}
          title="Select an attempt"
          description="Choose an attempt from the queue to see its events and record your review."
        />
      </div>
    )
  }
  return (
    <div className="space-y-4" aria-label={`Review of ${attempt.studentName}`} role="region">
      <div>
        <h2 className="text-base font-semibold text-text">{attempt.studentName}</h2>
        <p className="text-sm text-text-muted">
          <span className="font-mono">{attempt.rollNo}</span>, {attempt.assessmentTitle}
        </p>
      </div>
      <Section title="Event timeline">
        <Timeline events={events} />
      </Section>
      <Section title="Your review">
        <ReviewForm key={attempt.id} />
      </Section>
    </div>
  )
}
