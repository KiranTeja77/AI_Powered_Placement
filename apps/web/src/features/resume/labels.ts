import type { StatusTone } from '@/components/StatusBadge'
import type { GapStatus, Importance, Priority, SkillGrade } from '@/lib/api/resume-types'

export const GRADE: Record<SkillGrade, { tone: StatusTone; label: string }> = {
  applied: { tone: 'success', label: 'Applied' },
  listed: { tone: 'info', label: 'Listed' },
}

export const GAP: Record<GapStatus, { tone: StatusTone; label: string }> = {
  matched: { tone: 'success', label: 'Matched' },
  partial: { tone: 'warning', label: 'Partial' },
  possible: { tone: 'warning', label: 'Possible' },
  missing: { tone: 'danger', label: 'Missing' },
}

export const IMPORTANCE: Record<Importance, string> = {
  core: 'Core',
  important: 'Important',
  bonus: 'Bonus',
}

export const PRIORITY: Record<Priority, { tone: StatusTone; label: string }> = {
  high: { tone: 'danger', label: 'High priority' },
  medium: { tone: 'warning', label: 'Medium priority' },
  low: { tone: 'neutral', label: 'Low priority' },
}

/** Where in the resume an item was found, in words. */
export const SECTION: Record<string, string> = {
  header: 'Header',
  summary: 'Summary',
  skills: 'Skills section',
  projects: 'Projects',
  experience: 'Experience or internship',
  education: 'Education',
  certifications: 'Certifications',
  achievements: 'Achievements',
  activities: 'Activities',
  interests: 'Interests',
  languages: 'Languages',
  publications: 'Publications',
  other: 'Other',
}

export function sectionLabel(name: string): string {
  return SECTION[name] ?? 'Resume'
}
