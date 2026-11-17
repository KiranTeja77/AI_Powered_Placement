/**
 * Shapes the T&P screens expect from the API once it exists. Nothing here is data: the screens
 * get empty results from the hooks in `pending.ts`.
 */

export interface DepartmentReadiness {
  department: string
  /** Average readiness as a percentage, or null when nobody has been assessed. */
  readinessPercent: number | null
  students: number
}

export interface ParticipationRow {
  assessmentTitle: string
  invited: number
  attempted: number
}

export interface UpcomingDriveRow {
  id: string
  company: string
  role: string
  driveDate: string
}

export interface HeatmapCell {
  department: string
  topic: string
  /** Average score as a percentage, or null when there are no attempts. */
  percent: number | null
}

export interface TrendPoint {
  semester: string
  percent: number
}

export type DriveStatus = 'draft' | 'open' | 'closed' | 'completed'

export interface TpDriveRow {
  id: string
  company: string
  role: string
  driveDate: string
  status: DriveStatus
  eligibleCount: number
  shortlistedCount: number
}

export type CriterionResult = 'met' | 'not_met' | 'unknown'

export interface EligibilityCriterionColumn {
  id: string
  label: string
}

export interface EligibilityStudent {
  studentId: string
  name: string
  rollNo: string
  results: Record<string, CriterionResult>
  /** One plain sentence per criterion: what the rule needs and what the record shows. */
  explanation: string[]
}

export interface EligibilityReport {
  driveTitle: string
  /** Where the criteria came from, for example "Company email, 12 Nov". */
  criteriaSource: string
  criteria: EligibilityCriterionColumn[]
  students: EligibilityStudent[]
}

export type ConsentStatus = 'given' | 'pending' | 'declined'

export interface ShortlistCandidate {
  studentId: string
  name: string
  rollNo: string
  department: string
  cgpa: number | null
  consent: ConsentStatus
}

export interface ShortlistReport {
  driveTitle: string
  candidates: ShortlistCandidate[]
}

export interface PlacementRow {
  driveId: string
  company: string
  role: string
  applied: number
  shortlisted: number
  interviewed: number
  offered: number
}
