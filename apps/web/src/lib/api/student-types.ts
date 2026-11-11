/**
 * Shapes the student screens expect from the API once it exists. Nothing in this file is data:
 * the screens that use these types get empty results from the hooks in `pending.ts`.
 */

export type Priority = 'high' | 'medium' | 'low'

export interface WeeklyTask {
  id: string
  title: string
  priority: Priority
  /** Why this task is in the plan. Every task explains itself. */
  reason: string
  estimatedMinutes: number
  done: boolean
}

export interface LessonSummary {
  id: string
  title: string
  done: boolean
}

export interface TrainingTopic {
  id: string
  title: string
  lessons: LessonSummary[]
}

/** Topics grouped by department (technical) or by area (non-technical). */
export interface TrainingGroup {
  name: string
  topics: TrainingTopic[]
}

export interface LessonSection {
  heading: string
  paragraphs: string[]
}

export interface PracticeQuestion {
  id: string
  prompt: string
  options: string[]
  /** Revealed one at a time, gentlest first. */
  hints: string[]
}

export interface Lesson {
  id: string
  topicId: string
  topicTitle: string
  title: string
  sections: LessonSection[]
  practice: PracticeQuestion[]
}

export interface SampleTest {
  id: string
  input: string
  expectedOutput: string
}

export interface CodingProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  statement: string
  constraints: string[]
  sampleTests: SampleTest[]
}

export type AssessmentStatus = 'upcoming' | 'in_progress' | 'completed'

export interface Assessment {
  id: string
  title: string
  kind: string
  status: AssessmentStatus
  /** ISO timestamp of the start, or of the attempt for completed ones. */
  startsAt: string
  durationMinutes: number
  questionCount: number
  /** Set once an attempt exists. */
  attemptId: string | null
}

export interface AssessmentQuestion {
  id: string
  prompt: string
  options: string[]
}

export interface TopicScore {
  topic: string
  correct: number
  total: number
}

export interface AnswerReview {
  questionId: string
  prompt: string
  yourAnswer: string | null
  correctAnswer: string
  correct: boolean
  explanation: string
}

export interface RecommendedPractice {
  topic: string
  reason: string
  to: string
}

export interface AttemptResult {
  attemptId: string
  assessmentTitle: string
  score: number
  maxScore: number
  timeSpentSeconds: number
  topics: TopicScore[]
  answers: AnswerReview[]
  recommended: RecommendedPractice[]
}

export interface TopicProgress {
  topic: string
  /** Latest score as a percentage, 0 to 100. */
  latestPercent: number
  /** Change since the attempt before, in percentage points. Null with a single attempt. */
  changePoints: number | null
  attempts: number
  lastActivityAt: string
}

export interface Interview {
  id: string
  title: string
  kind: string
  scheduledAt: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export type CriterionStatus = 'met' | 'not_met' | 'unknown'

export interface EligibilityCriterion {
  id: string
  label: string
  requirement: string
  yourValue: string | null
  status: CriterionStatus
}

export interface Drive {
  id: string
  company: string
  role: string
  location: string
  deadline: string
  summary: string
  criteria: EligibilityCriterion[]
}

export interface DriveRow {
  id: string
  company: string
  role: string
  deadline: string
  eligibility: 'eligible' | 'not_eligible' | 'unknown'
}

export interface FeedbackNote {
  id: string
  from: string
  at: string
  message: string
}

export interface ScoreSummary {
  assessmentTitle: string
  percent: number
  at: string
}

export interface UpcomingDrive {
  id: string
  company: string
  role: string
  deadline: string
}
