import { z } from 'zod'

export const STAFF_ROLES = [
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'TP_HEAD', label: 'T&P head' },
  { value: 'RECRUITER', label: 'Recruiter' },
  { value: 'ADMIN', label: 'Admin' },
] as const

export const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  TP_HEAD: 'T&P head',
  RECRUITER: 'Recruiter',
  ADMIN: 'Admin',
}

/** There is no password field: the person chooses theirs from the emailed link. */
export const createUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Enter the full name')
      .max(120, 'Use 120 characters or fewer'),
    email: z.email('Enter a valid email address').max(254, 'Use 254 characters or fewer'),
    role: z.enum(['FACULTY', 'TP_HEAD', 'RECRUITER', 'ADMIN'], { error: 'Choose a role' }),
    departmentId: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'FACULTY' && v.departmentId === '') {
      ctx.addIssue({ code: 'custom', path: ['departmentId'], message: 'Choose the department' })
    }
  })
export type CreateUserValues = z.infer<typeof createUserSchema>
