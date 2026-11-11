import type { Role } from '@/lib/api/types'

/** Where each role lands after signing in, and the URL prefix it owns. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: '/s',
  FACULTY: '/f',
  TP_HEAD: '/tp',
  ADMIN: '/admin',
  RECRUITER: '/r',
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  TP_HEAD: 'Training and placement',
  ADMIN: 'Administrator',
  RECRUITER: 'Recruiter',
}
