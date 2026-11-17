/**
 * Shapes the faculty screens expect from the API once it exists. Nothing here is data: the
 * screens get empty results from the hooks in `pending.ts`.
 */

export type StudentStatus = 'on_track' | 'needs_attention' | 'inactive'

export interface MentoredStudent {
  id: string
  name: string
  rollNo: string
  departmentId: string
  department: string
  graduationYear: number
  latestScorePercent: number | null
  weakestTopic: string | null
  lastActivityAt: string | null
  status: StudentStatus
  /** Why the student needs attention, when they do. */
  attentionReason: string | null
}

export interface RecentResult {
  id: string
  studentName: string
  assessmentTitle: string
  percent: number
  at: string
}

export interface FollowUp {
  id: string
  studentName: string
  dueOn: string
  note: string
}

export interface TestHistoryRow {
  id: string
  title: string
  at: string
  percent: number
}

export interface TopicGap {
  topic: string
  percent: number
}

export interface ResumeSummary {
  analyzedAt: string
  topRole: string
  readinessPercent: number
  skillCount: number
}

export interface MentoringNote {
  id: string
  studentId: string
  studentName: string
  at: string
  note: string
  assignedPractice: string | null
  followUpOn: string | null
}

export interface Student360 {
  student: MentoredStudent
  email: string
  tests: TestHistoryRow[]
  gaps: TopicGap[]
  resume: ResumeSummary | null
  notes: MentoringNote[]
}

export type QuestionType = 'mcq_single' | 'mcq_multi' | 'numeric' | 'short' | 'coding'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'retired'

export interface QuestionRow {
  id: string
  text: string
  topic: string
  department: string
  difficulty: Difficulty
  type: QuestionType
  marks: number
  status: ReviewStatus
}

export type ProctorReviewStatus = 'pending' | 'reviewed'

export interface ProctorAttempt {
  id: string
  studentName: string
  rollNo: string
  assessmentTitle: string
  eventCount: number
  status: ProctorReviewStatus
}

export interface ProctorEvent {
  id: string
  type: string
  at: string
  durationSeconds: number | null
}
