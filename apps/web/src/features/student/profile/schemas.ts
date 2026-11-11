import { z } from 'zod'

const graduationYear = z
  .number({ error: 'Enter a graduation year' })
  .int('Enter a graduation year')
  .min(2000, 'Enter a year from 2000 to 2100')
  .max(2100, 'Enter a year from 2000 to 2100')

/** An optional link: empty is fine, anything else must be an https address. */
const optionalLink = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^https:\/\/\S+\.\S+$/.test(v),
    'Use a full link starting with https://',
  )

export const basicsSchema = z.object({
  departmentId: z.string().min(1, 'Select a department'),
  graduationYear,
})
export type BasicsValues = z.infer<typeof basicsSchema>

export const educationSchema = z.object({
  degree: z.string().trim().min(1, 'Enter your degree').max(80, 'Use 80 characters or fewer'),
  institution: z
    .string()
    .trim()
    .min(1, 'Enter your college')
    .max(120, 'Use 120 characters or fewer'),
  cgpa: z
    .number({ error: 'Enter your CGPA, for example 8.4' })
    .min(0, 'CGPA cannot be below 0')
    .max(10, 'CGPA cannot be above 10'),
  twelfthPercent: z
    .number({ error: 'Enter your 12th percentage' })
    .min(0, 'Enter a percentage from 0 to 100')
    .max(100, 'Enter a percentage from 0 to 100'),
})
export type EducationValues = z.infer<typeof educationSchema>

export const profileSchema = basicsSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(1, 'Enter your full name')
    .max(120, 'Use 120 characters or fewer'),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[6-9]\d{9}$/.test(v), 'Enter a 10-digit mobile number'),
  linkedin: optionalLink,
  github: optionalLink,
})
export type ProfileValues = z.infer<typeof profileSchema>
