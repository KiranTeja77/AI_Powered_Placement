import { useCurrentUser } from '@/features/auth/auth-context'
import { useAnalyses, useCareerInterests } from '@/features/resume/queries'

export interface ChecklistItem {
  id: string
  label: string
  /** What counts, or what is missing. */
  detail: string
  /** True or false once known; null while it loads. */
  done: boolean | null
  /** Where the student can complete it, if they can act now. */
  to?: string
}

export interface Checklist {
  items: ChecklistItem[]
  complete: number
  total: number
  loading: boolean
}

/**
 * Profile completeness from real data only: the account, the saved career interests and the
 * student's resume analyses. The academic record cannot be completed by the student; the college
 * imports it, so it stays open until that exists.
 */
export function useProfileChecklist(): Checklist {
  const user = useCurrentUser()
  const interests = useCareerInterests()
  const analyses = useAnalyses(0)

  const items: ChecklistItem[] = [
    {
      id: 'account',
      label: 'Account details',
      detail: 'Name, college email and roll number',
      done: Boolean(user.fullName && user.email && user.student?.rollNo),
    },
    {
      id: 'department',
      label: 'Department and graduation year',
      detail: 'Used to match you with drives and training',
      done: Boolean(user.department && user.student?.graduationYear),
    },
    {
      id: 'interests',
      label: 'Career interests',
      detail: 'At least one role you want to prepare for',
      done: interests.isSuccess ? interests.data.roleSlugs.length > 0 : null,
      to: '/s/career',
    },
    {
      id: 'resume',
      label: 'Resume analysis',
      detail: 'At least one analyzed resume',
      done: analyses.isSuccess ? analyses.data.totalItems > 0 : null,
      to: '/s/resume',
    },
    {
      id: 'academic',
      label: 'Academic record',
      detail: 'Imported and verified by your college',
      done: false,
    },
  ]
  return {
    items,
    complete: items.filter((i) => i.done === true).length,
    total: items.length,
    loading: items.some((i) => i.done === null),
  }
}
