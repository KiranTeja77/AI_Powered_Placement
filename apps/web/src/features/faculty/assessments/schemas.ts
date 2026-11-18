import { z } from 'zod'

export const TRACKS = [
  { value: 'technical', label: 'Technical' },
  { value: 'non_technical', label: 'Non-technical' },
  { value: 'mixed', label: 'Technical and non-technical' },
] as const

const numberIn = (min: number, max: number, what: string) =>
  z
    .string()
    .refine((v) => v.trim() !== '' && Number.isFinite(Number(v)), `Enter ${what}`)
    .refine(
      (v) =>
        v.trim() === '' || !Number.isFinite(Number(v)) || (Number(v) >= min && Number(v) <= max),
      `${what[0]!.toUpperCase()}${what.slice(1)} must be between ${min} and ${max}`,
    )

export const assessmentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Enter a title of at least 3 characters')
      .max(120, 'Use 120 characters or fewer'),
    track: z.enum(['technical', 'non_technical', 'mixed'], { error: 'Choose a track' }),
    departmentId: z.string().min(1, 'Select a department'),
    durationMinutes: numberIn(5, 300, 'a duration in minutes'),
    totalMarks: numberIn(1, 1000, 'the total marks'),
    startsAt: z.string().min(1, 'Choose when the window opens'),
    endsAt: z.string().min(1, 'Choose when the window closes'),
    sections: z
      .array(z.object({ id: z.string(), name: z.string().trim().min(1, 'Name the section') }))
      .min(1, 'Add at least one section'),
    /** Questions picked from the bank, each placed in a section. */
    questions: z.array(
      z.object({ id: z.string(), text: z.string(), sectionId: z.string(), marks: z.number() }),
    ),
    fullScreenRequired: z.boolean(),
    tabSwitchLogging: z.boolean(),
    cameraRequired: z.boolean(),
    microphoneRequired: z.boolean(),
    warningThreshold: numberIn(1, 10, 'a warning threshold'),
  })
  .superRefine((a, ctx) => {
    if (a.startsAt && a.endsAt && a.endsAt <= a.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'The window must close after it opens',
      })
    }
    // With questions picked, the total must be exactly what they add up to. With none picked
    // there is nothing to add up, so the preview's "no questions yet" warning is all there is.
    if (
      a.questions.length > 0 &&
      Number.isFinite(Number(a.totalMarks)) &&
      a.totalMarks.trim() !== ''
    ) {
      const picked = a.questions.reduce((sum, q) => sum + q.marks, 0)
      if (Number(a.totalMarks) !== picked) {
        ctx.addIssue({
          code: 'custom',
          path: ['totalMarks'],
          message: `Total marks is ${a.totalMarks}, but the picked questions add up to ${picked}. Change the total or the questions.`,
        })
      }
    }
    const names = a.sections.map((s) => s.name.trim().toLowerCase())
    names.forEach((n, i) => {
      if (n !== '' && names.indexOf(n) !== i) {
        ctx.addIssue({
          code: 'custom',
          path: ['sections', i, 'name'],
          message: 'Section names must be different',
        })
      }
    })
  })
export type AssessmentValues = z.infer<typeof assessmentSchema>
