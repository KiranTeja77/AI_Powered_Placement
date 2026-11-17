import { z } from 'zod'

export const QUESTION_TYPES = [
  { value: 'mcq_single', label: 'Multiple choice, one answer' },
  { value: 'mcq_multi', label: 'Multiple choice, several answers' },
  { value: 'numeric', label: 'Numeric answer' },
  { value: 'short', label: 'Short answer' },
  { value: 'coding', label: 'Coding problem' },
] as const

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const

/** Numbers come from text inputs as strings, so an empty box is not mistaken for 0. */
const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))

export const questionSchema = z
  .object({
    type: z.enum(['mcq_single', 'mcq_multi', 'numeric', 'short', 'coding'], {
      error: 'Choose a question type',
    }),
    text: z
      .string()
      .trim()
      .min(10, 'Write the question in at least 10 characters')
      .max(4000, 'Use 4,000 characters or fewer'),
    topic: z.string().trim().min(1, 'Enter a topic').max(80, 'Use 80 characters or fewer'),
    departmentId: z.string().min(1, 'Select a department'),
    difficulty: z.enum(['easy', 'medium', 'hard'], { error: 'Choose a difficulty' }),
    marks: z
      .string()
      .refine(isNumber, 'Enter the marks, for example 2')
      .refine((v) => !isNumber(v) || Number(v) > 0, 'Marks must be more than 0')
      .refine((v) => !isNumber(v) || Number(v) <= 100, 'Marks cannot be more than 100'),
    explanation: z
      .string()
      .trim()
      .min(10, 'Explain the answer in at least 10 characters')
      .max(2000, 'Use 2,000 characters or fewer'),
    options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
    numericAnswer: z.string(),
    tolerance: z.string(),
    acceptedAnswers: z.string(),
    testCases: z.array(z.object({ input: z.string(), expected: z.string() })),
  })
  .superRefine((q, ctx) => {
    const add = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message })

    if (q.type === 'mcq_single' || q.type === 'mcq_multi') {
      q.options.forEach((o, i) => {
        if (o.text.trim() === '') add(['options', i, 'text'], 'Enter the option text')
      })
      const filled = q.options.filter((o) => o.text.trim() !== '')
      if (filled.length < 2) add(['options'], 'Add at least two options')
      const texts = filled.map((o) => o.text.trim().toLowerCase())
      if (new Set(texts).size !== texts.length) add(['options'], 'Options must be different')
      const correct = q.options.filter((o) => o.correct).length
      if (q.type === 'mcq_single' && correct !== 1)
        add(['options'], 'Mark exactly one correct option')
      if (q.type === 'mcq_multi' && correct < 1)
        add(['options'], 'Mark at least one correct option')
    }
    if (q.type === 'numeric') {
      if (!isNumber(q.numericAnswer)) add(['numericAnswer'], 'Enter the correct number')
      if (q.tolerance.trim() !== '' && (!isNumber(q.tolerance) || Number(q.tolerance) < 0)) {
        add(['tolerance'], 'Tolerance must be 0 or more')
      }
    }
    if (q.type === 'short') {
      const answers = q.acceptedAnswers.split('\n').filter((a) => a.trim() !== '')
      if (answers.length === 0) add(['acceptedAnswers'], 'Enter at least one accepted answer')
    }
    if (q.type === 'coding') {
      if (q.testCases.length === 0) add(['testCases'], 'Add at least one test case')
      q.testCases.forEach((t, i) => {
        if (t.expected.trim() === '') add(['testCases', i, 'expected'], 'Enter the expected output')
      })
    }
  })
export type QuestionValues = z.infer<typeof questionSchema>
