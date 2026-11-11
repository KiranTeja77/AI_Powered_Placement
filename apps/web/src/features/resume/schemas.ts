import { z } from 'zod'
import { MAX_ROLES, MAX_TEXT, MIN_TEXT } from '@/lib/api/resume-types'

/** Mirrors the API: 200 to 20,000 characters (spaces at the ends do not count toward the minimum). */
export const analyzeSchema = z.object({
  text: z
    .string()
    .min(1, 'Paste your resume text')
    .refine((v) => v.trim().length >= MIN_TEXT, `Use at least ${MIN_TEXT} characters`)
    .refine(
      (v) => v.length <= MAX_TEXT,
      `Use ${MAX_TEXT.toLocaleString('en-US')} characters or fewer`,
    ),
  targetRoles: z.array(z.string()).max(MAX_ROLES, `Choose up to ${MAX_ROLES} roles`),
})

export type AnalyzeValues = z.infer<typeof analyzeSchema>

/** A short, specific hint shown under the text box as the student types. */
export function describeLength(text: string): {
  message: string
  tone: 'neutral' | 'warning' | 'danger'
} {
  const trimmed = text.trim().length
  if (text.length > MAX_TEXT) {
    return {
      message: `${(text.length - MAX_TEXT).toLocaleString('en-US')} over the limit`,
      tone: 'danger',
    }
  }
  if (trimmed < MIN_TEXT) {
    return {
      message: `${(MIN_TEXT - trimmed).toLocaleString('en-US')} more characters needed`,
      tone: 'warning',
    }
  }
  return { message: 'Ready to analyze', tone: 'neutral' }
}
