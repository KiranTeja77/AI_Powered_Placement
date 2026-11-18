import { z } from 'zod'

/** What the platform enforces today, for reference. */
export const PASSWORD_POLICY = [
  'At least 8 characters, with a letter and a number.',
  'Stored with BCrypt at strength 12; nobody can read a password, including administrators.',
  'Five failed sign-ins in 15 minutes lock sign-in for that account and address.',
  'Sessions last 7 days and rotate each time they refresh. Reset and set-password links work once.',
] as const

const whole = (min: number, max: number, what: string) =>
  z
    .string()
    .refine((v) => /^\d+$/.test(v.trim()), `Enter ${what} as a whole number`)
    .refine(
      (v) => !/^\d+$/.test(v.trim()) || (Number(v) >= min && Number(v) <= max),
      `Use a number from ${min} to ${max}`,
    )

export const settingsSchema = z.object({
  attemptMonths: whole(1, 120, 'the months'),
  proctoringDays: whole(7, 3650, 'the days'),
  analysisMonths: whole(1, 120, 'the months'),
  fullScreenRequired: z.boolean(),
  tabSwitchLogging: z.boolean(),
  cameraRequired: z.boolean(),
  microphoneRequired: z.boolean(),
  warningThreshold: whole(1, 10, 'the threshold'),
})
export type SettingsValues = z.infer<typeof settingsSchema>
