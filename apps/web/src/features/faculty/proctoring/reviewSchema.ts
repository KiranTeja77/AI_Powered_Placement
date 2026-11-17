import { z } from 'zod'

export const OUTCOMES = [
  { value: 'no_issue', label: 'No issue', help: 'The events have an ordinary explanation.' },
  {
    value: 'needs_discussion',
    label: 'Needs discussion',
    help: 'Talk to the student before deciding anything.',
  },
  { value: 'escalate', label: 'Escalate', help: 'Pass this to the placement team to look into.' },
] as const

export const reviewSchema = z
  .object({
    outcome: z.enum(['no_issue', 'needs_discussion', 'escalate'], {
      error: 'Choose an outcome',
    }),
    notes: z.string().trim().max(2000, 'Use 2,000 characters or fewer'),
  })
  .superRefine((r, ctx) => {
    if (r.outcome !== 'no_issue' && r.notes.length < 10) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Write what you saw and why, in at least 10 characters',
      })
    }
  })
export type ReviewValues = z.infer<typeof reviewSchema>
