import { z } from 'zod'

const PASSWORD_MESSAGE = 'Use at least 8 characters with a letter and a number'

/** Mirrors the API: 8 to 72 bytes, with at least one letter and one number. */
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'Use 72 bytes or fewer')
  .refine((v) => /\p{L}/u.test(v) && /\p{N}/u.test(v), PASSWORD_MESSAGE)

const confirmMatches = (data: { newPassword: string; confirmPassword: string }) =>
  data.newPassword === data.confirmPassword

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or roll number'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Enter your full name')
      .max(120, 'Use 120 characters or fewer'),
    email: z.email('Enter a valid email address').max(254),
    rollNo: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9/_-]{2,31}$/,
        'Use 3 to 32 letters, numbers, slashes, dashes or underscores',
      ),
    departmentId: z.string().min(1, 'Select a department'),
    graduationYear: z
      .number({ error: 'Enter a graduation year' })
      .int('Enter a graduation year')
      .min(2000, 'Enter a year from 2000 to 2100')
      .max(2100, 'Enter a year from 2000 to 2100'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine(confirmMatches, { path: ['confirmPassword'], message: 'Passwords do not match' })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine(confirmMatches, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ['newPassword'],
    message: 'Choose a password you have not used here before',
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
