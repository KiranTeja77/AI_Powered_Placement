import { z } from 'zod'

const today = () => new Date().toISOString().slice(0, 10)

/** An optional number in a range: empty is fine, anything else must be a number inside it. */
const optionalNumber = (min: number, max: number, what: string) =>
  z
    .string()
    .refine(
      (v) =>
        v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      `${what} must be a number from ${min} to ${max}`,
    )

export const driveSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(2, 'Enter the company name')
      .max(120, 'Use 120 characters or fewer'),
    role: z.string().trim().min(2, 'Enter the role').max(120, 'Use 120 characters or fewer'),
    description: z
      .string()
      .trim()
      .min(20, 'Describe the job in at least 20 characters')
      .max(5000, 'Use 5,000 characters or fewer'),
    ctc: z
      .string()
      .refine(
        (v) => v.trim() !== '' && Number.isFinite(Number(v)),
        'Enter the CTC in lakh per year',
      )
      .refine(
        (v) => !Number.isFinite(Number(v)) || (Number(v) > 0 && Number(v) <= 500),
        'CTC must be more than 0 and at most 500',
      ),
    location: z
      .string()
      .trim()
      .min(2, 'Enter the location')
      .max(120, 'Use 120 characters or fewer'),
    departmentIds: z.array(z.string()).min(1, 'Choose at least one department'),
    graduationYear: z
      .string()
      .refine((v) => /^\d{4}$/.test(v.trim()), 'Enter a four-digit graduation year')
      .refine(
        (v) => !/^\d{4}$/.test(v.trim()) || (Number(v) >= 2000 && Number(v) <= 2100),
        'Enter a year from 2000 to 2100',
      ),
    minCgpa: optionalNumber(0, 10, 'Minimum CGPA'),
    minPercentage: optionalNumber(0, 100, 'Minimum percentage'),
    maxBacklogs: z
      .string()
      .refine((v) => /^\d+$/.test(v.trim()), 'Enter the maximum backlogs, 0 for none')
      .refine((v) => !/^\d+$/.test(v.trim()) || Number(v) <= 20, 'Use 20 or fewer'),
    skillSlugs: z.array(z.string()).max(20, 'Choose at most 20 skills'),
    stages: z
      .array(z.object({ id: z.string(), name: z.string().trim().min(1, 'Name the stage') }))
      .min(1, 'Add at least one recruitment stage'),
    driveDate: z
      .string()
      .min(1, 'Choose the drive date')
      .refine((v) => v === '' || v >= today(), 'Choose today or a later date'),
    criteriaSource: z
      .string()
      .trim()
      .min(3, 'Say where these criteria came from, for example "Company email, 12 Nov"')
      .max(200, 'Use 200 characters or fewer'),
  })
  .superRefine((d, ctx) => {
    const names = d.stages.map((s) => s.name.trim().toLowerCase())
    names.forEach((n, i) => {
      if (n !== '' && names.indexOf(n) !== i) {
        ctx.addIssue({
          code: 'custom',
          path: ['stages', i, 'name'],
          message: 'Stage names must be different',
        })
      }
    })
  })
export type DriveValues = z.infer<typeof driveSchema>
