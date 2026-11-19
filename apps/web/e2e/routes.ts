/**
 * Every screen of the app, by the role that sees it, with a stable name for screenshots. The
 * design audit and the accessibility run both walk this list, so a new route is covered by adding
 * it here once. Paths use placeholder ids: no record exists, so those pages show their empty states.
 */
export interface Route {
  name: string
  path: string
}

export type SignedInRole = 'STUDENT' | 'FACULTY' | 'TP_HEAD' | 'ADMIN' | 'RECRUITER'

/** Pages anyone can open without signing in. */
export const PUBLIC_ROUTES: Route[] = [
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'reset-password', path: '/reset-password?token=sample' },
  { name: 'set-password', path: '/set-password?token=sample' },
  { name: 'forbidden', path: '/403' },
  { name: 'not-found', path: '/404' },
  { name: 'server-error', path: '/500' },
]

/** Screens every signed-in role shares. */
export const SHARED_ROUTES: Route[] = [
  { name: 'account', path: '/settings/account' },
  { name: 'notifications', path: '/notifications' },
  { name: 'notifications-unread', path: '/notifications?tab=unread' },
]

export const ROUTES: Record<SignedInRole, { prefix: string; routes: Route[] }> = {
  STUDENT: {
    prefix: 'student',
    routes: [
      { name: 'overview', path: '/s' },
      { name: 'onboarding', path: '/s/onboarding' },
      { name: 'profile', path: '/s/profile' },
      { name: 'roadmap', path: '/s/roadmap' },
      { name: 'training-technical', path: '/s/training/technical' },
      { name: 'training-non-technical', path: '/s/training/non-technical' },
      { name: 'lesson', path: '/s/training/topic/lesson' },
      { name: 'coding', path: '/s/practice/coding/problem' },
      { name: 'assessments', path: '/s/assessments' },
      { name: 'assessments-in-progress', path: '/s/assessments?tab=in_progress' },
      { name: 'assessments-completed', path: '/s/assessments?tab=completed' },
      { name: 'assessment-start', path: '/s/assessments/sample/start' },
      { name: 'assessment-take', path: '/s/assessments/sample/take' },
      { name: 'result', path: '/s/results/attempt' },
      { name: 'progress', path: '/s/progress' },
      { name: 'interviews', path: '/s/interviews' },
      { name: 'drives', path: '/s/drives' },
      { name: 'drive', path: '/s/drives/sample' },
      { name: 'feedback', path: '/s/feedback' },
      { name: 'resume', path: '/s/resume' },
      { name: 'career', path: '/s/career' },
    ],
  },
  FACULTY: {
    prefix: 'faculty',
    routes: [
      { name: 'overview', path: '/f' },
      { name: 'students', path: '/f/students' },
      { name: 'student', path: '/f/students/sample' },
      { name: 'mentoring', path: '/f/mentoring' },
      { name: 'questions', path: '/f/questions' },
      { name: 'question-new', path: '/f/questions/new' },
      { name: 'question-edit', path: '/f/questions/sample' },
      { name: 'assessment-new', path: '/f/assessments/new' },
      { name: 'proctoring', path: '/f/proctoring' },
    ],
  },
  TP_HEAD: {
    prefix: 'tp',
    routes: [
      { name: 'overview', path: '/tp' },
      { name: 'analytics', path: '/tp/analytics' },
      { name: 'drives', path: '/tp/drives' },
      { name: 'drive-new', path: '/tp/drives/new' },
      { name: 'eligibility', path: '/tp/drives/sample/eligibility' },
      { name: 'shortlist', path: '/tp/drives/sample/shortlist' },
      { name: 'academic-import', path: '/tp/academic-import' },
      { name: 'placements', path: '/tp/placements' },
    ],
  },
  ADMIN: {
    prefix: 'admin',
    routes: [
      { name: 'overview', path: '/admin' },
      { name: 'users', path: '/admin/users' },
      { name: 'departments', path: '/admin/departments' },
      { name: 'roles', path: '/admin/roles' },
      { name: 'audit', path: '/admin/audit' },
      { name: 'settings', path: '/admin/settings' },
    ],
  },
  RECRUITER: {
    prefix: 'recruiter',
    routes: [
      { name: 'overview', path: '/r' },
      { name: 'drive', path: '/r/drives/sample' },
    ],
  },
}
