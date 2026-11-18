import { z } from 'zod'

export const departmentSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2,16}$/, 'Use 2 to 16 capital letters or digits, for example CSE'),
  name: z
    .string()
    .trim()
    .min(3, 'Enter at least 3 characters')
    .max(120, 'Use 120 characters or fewer'),
})
export type DepartmentValues = z.infer<typeof departmentSchema>
