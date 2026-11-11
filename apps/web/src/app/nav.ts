import {
  BookOpen,
  Briefcase,
  Building2,
  ChartNoAxesColumn,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  User,
  UserCog,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/api/types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Only the exact path highlights this item (used for each role's overview). */
  end?: boolean
  /** Optional section heading above this item. */
  group?: string
}

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { label: 'Overview', to: '/s', icon: LayoutDashboard, end: true },
    { label: 'Profile', to: '/s/profile', icon: User },
    { label: 'Roadmap', to: '/s/roadmap', icon: Route },
    { label: 'Resume analyzer', to: '/s/resume', icon: FileText, group: 'Prepare' },
    { label: 'Career interests', to: '/s/career', icon: Target },
    { label: 'Technical training', to: '/s/training/technical', icon: BookOpen },
    { label: 'Non-technical training', to: '/s/training/non-technical', icon: MessageSquare },
    { label: 'Assessments', to: '/s/assessments', icon: ClipboardCheck, group: 'Practice' },
    { label: 'Progress', to: '/s/progress', icon: ChartNoAxesColumn },
    { label: 'Interviews', to: '/s/interviews', icon: Video },
    { label: 'Drives', to: '/s/drives', icon: Briefcase, group: 'Placements' },
    { label: 'Feedback', to: '/s/feedback', icon: MessageSquare },
  ],
  FACULTY: [
    { label: 'Overview', to: '/f', icon: LayoutDashboard, end: true },
    { label: 'Students', to: '/f/students', icon: GraduationCap },
    { label: 'Mentoring', to: '/f/mentoring', icon: UsersRound },
    { label: 'Question bank', to: '/f/questions', icon: ListChecks, group: 'Assessments' },
    { label: 'New assessment', to: '/f/assessments/new', icon: ClipboardList },
    { label: 'Proctoring review', to: '/f/proctoring', icon: ShieldCheck },
  ],
  TP_HEAD: [
    { label: 'Overview', to: '/tp', icon: LayoutDashboard, end: true },
    { label: 'Analytics', to: '/tp/analytics', icon: ChartNoAxesColumn },
    { label: 'Drives', to: '/tp/drives', icon: Briefcase, group: 'Recruitment' },
    { label: 'Placements', to: '/tp/placements', icon: Trophy },
    { label: 'Academic import', to: '/tp/academic-import', icon: FileUp },
  ],
  ADMIN: [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Departments', to: '/admin/departments', icon: Building2 },
    { label: 'Roles and permissions', to: '/admin/roles', icon: UserCog },
    { label: 'Audit log', to: '/admin/audit', icon: ScrollText },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ],
  RECRUITER: [
    { label: 'Overview', to: '/r', icon: LayoutDashboard, end: true },
    { label: 'Drives', to: '/r/drives', icon: Briefcase },
  ],
}

/** The nav item whose path is the longest prefix of the given pathname. */
export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  return NAV[role]
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
}
