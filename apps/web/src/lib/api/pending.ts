/**
 * Hooks for screens whose backend does not exist yet. They return an empty result immediately and
 * make NO network call, so every such screen renders its designed empty state. When an endpoint is
 * built, replace the hook with a real TanStack Query hook of the same shape.
 *
 * Never put sample data here: empty means empty.
 */

import type {
  Assessment,
  AssessmentQuestion,
  AttemptResult,
  CodingProblem,
  Drive,
  DriveRow,
  FeedbackNote,
  Interview,
  Lesson,
  ScoreSummary,
  TopicProgress,
  TrainingGroup,
  UpcomingDrive,
  WeeklyTask,
} from './student-types'

export interface PendingQuery<T> {
  data: T
  isLoading: false
  isError: false
  refetch: () => void
}

export interface Page<T> {
  items: T[]
  total: number
}

function empty<T>(data: T): PendingQuery<T> {
  return { data, isLoading: false, isError: false, refetch: () => undefined }
}

/** A list that has no records yet. */
export function usePendingList<T>(): PendingQuery<T[]> {
  return empty<T[]>([])
}

/** A single record that does not exist yet. */
export function usePendingItem<T>(): PendingQuery<T | null> {
  return empty<T | null>(null)
}

/** A paginated result with no records yet. */
export function usePendingPage<T>(): PendingQuery<Page<T>> {
  return empty<Page<T>>({ items: [], total: 0 })
}

// Student screens. Each hook is a placeholder for the endpoint in its TODO and makes no request.

/** TODO(api): GET /api/v1/student/tasks?week=current -> WeeklyTask[] */
export const useWeeklyTasks = () => usePendingList<WeeklyTask>()

/** TODO(api): GET /api/v1/student/scores?limit=5 -> ScoreSummary[] */
export const useLatestScores = () => usePendingList<ScoreSummary>()

/** TODO(api): GET /api/v1/student/drives?status=upcoming -> UpcomingDrive[] */
export const useUpcomingDrives = () => usePendingList<UpcomingDrive>()

/** TODO(api): GET /api/v1/training/tracks/{technical|non-technical} -> TrainingGroup[] */
export const useTrainingTrack = (kind: 'technical' | 'non-technical') => {
  void kind
  return usePendingList<TrainingGroup>()
}

/** TODO(api): GET /api/v1/training/topics/{topicId}/lessons/{lessonId} -> Lesson */
export const useLesson = (topicId: string, lessonId: string) => {
  void topicId
  void lessonId
  return usePendingItem<Lesson>()
}

/** TODO(api): GET /api/v1/practice/coding/{id} -> CodingProblem */
export const useCodingProblem = (id: string) => {
  void id
  return usePendingItem<CodingProblem>()
}

/** TODO(api): GET /api/v1/student/assessments -> Assessment[] (all three statuses) */
export const useAssessments = () => usePendingList<Assessment>()

/** TODO(api): GET /api/v1/student/assessments/{id} -> Assessment */
export const useAssessment = (id: string) => {
  void id
  return usePendingItem<Assessment>()
}

/** TODO(api): GET /api/v1/student/assessments/{id}/questions -> AssessmentQuestion[] */
export const useAssessmentQuestions = (id: string) => {
  void id
  return usePendingList<AssessmentQuestion>()
}

/** TODO(api): GET /api/v1/student/attempts/{attemptId}/result -> AttemptResult */
export const useAttemptResult = (attemptId: string) => {
  void attemptId
  return usePendingItem<AttemptResult>()
}

/** TODO(api): GET /api/v1/student/progress/topics -> TopicProgress[] */
export const useTopicProgress = () => usePendingList<TopicProgress>()

/** TODO(api): GET /api/v1/student/interviews -> Interview[] */
export const useInterviews = () => usePendingList<Interview>()

/** TODO(api): GET /api/v1/student/drives -> DriveRow[] */
export const useDrives = () => usePendingList<DriveRow>()

/** TODO(api): GET /api/v1/student/drives/{id} -> Drive (criteria evaluated for this student) */
export const useDrive = (id: string) => {
  void id
  return usePendingItem<Drive>()
}

/** TODO(api): GET /api/v1/student/feedback -> FeedbackNote[] */
export const useFeedback = () => usePendingList<FeedbackNote>()

// Intended endpoints for the screens that use the hooks above. Each is a TODO(api) until built.
// TODO(api): GET /api/v1/student/overview            -> StudentOverview
// TODO(api): GET /api/v1/student/assessments         -> Page<Assessment>
// TODO(api): GET /api/v1/student/drives              -> Page<Drive>
// TODO(api): GET /api/v1/faculty/students            -> Page<MentoredStudent>
// TODO(api): GET /api/v1/tp/drives                   -> Page<Drive>
// TODO(api): GET /api/v1/notifications               -> Page<Notification>
