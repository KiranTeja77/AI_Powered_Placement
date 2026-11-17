import { z } from 'zod'

const today = () => new Date().toISOString().slice(0, 10)

/** An optional date field: empty is fine, otherwise it must not be in the past. */
const optionalFutureDate = z
  .string()
  .refine((v) => v === '' || v >= today(), 'Choose today or a later date')

export const noteSchema = z.object({
  studentRollNo: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9/_-]{2,31}$/,
      'Enter the student roll number, for example 21CS001',
    ),
  note: z
    .string()
    .trim()
    .min(5, 'Write at least 5 characters')
    .max(1000, 'Use 1,000 characters or fewer'),
  assignedPractice: z.string().trim().max(200, 'Use 200 characters or fewer'),
  followUpOn: optionalFutureDate,
})
export type NoteValues = z.infer<typeof noteSchema>

export const assignPracticeSchema = z.object({
  topic: z.string().trim().min(1, 'Enter a topic').max(120, 'Use 120 characters or fewer'),
  dueOn: z
    .string()
    .min(1, 'Choose a due date')
    .refine((v) => v >= today(), 'Choose today or a later date'),
  note: z.string().trim().max(500, 'Use 500 characters or fewer'),
})
export type AssignPracticeValues = z.infer<typeof assignPracticeSchema>
