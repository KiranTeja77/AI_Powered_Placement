import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import AccountSettingsPage from '@/features/account/AccountSettingsPage'
import { PublicOnly, RequireRole, RootRedirect } from '@/features/auth/guards'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import SetPasswordPage from '@/features/auth/SetPasswordPage'
import AuditPage from '@/features/admin/audit/AuditPage'
import DepartmentsPage from '@/features/admin/departments/DepartmentsPage'
import RolesPage from '@/features/admin/roles/RolesPage'
import SettingsPage from '@/features/admin/settings/SettingsPage'
import UsersPage from '@/features/admin/users/UsersPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import RecruiterDrivePage from '@/features/recruiter/RecruiterDrivePage'
import RecruiterOverviewPage from '@/features/recruiter/RecruiterOverviewPage'
import { ROLE_HOME } from '@/features/auth/roles'
import CareerPage from '@/features/career/CareerPage'
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '@/features/errors/ErrorPages'
import AnalysisPage from '@/features/resume/AnalysisPage'
import FacultyOverviewPage from '@/features/faculty/overview/FacultyOverviewPage'
import QuestionFormPage from '@/features/faculty/questions/QuestionFormPage'
import QuestionsPage from '@/features/faculty/questions/QuestionsPage'
import AssessmentBuilderPage from '@/features/faculty/assessments/AssessmentBuilderPage'
import ProctoringPage from '@/features/faculty/proctoring/ProctoringPage'
import MentoringPage from '@/features/faculty/mentoring/MentoringPage'
import Student360Page from '@/features/faculty/students/Student360Page'
import StudentsPage from '@/features/faculty/students/StudentsPage'
import AnalyticsPage from '@/features/tp/analytics/AnalyticsPage'
import DriveFormPage from '@/features/tp/drives/DriveFormPage'
import EligibilityPage from '@/features/tp/drives/EligibilityPage'
import ShortlistPage from '@/features/tp/drives/ShortlistPage'
import TpDrivesPage from '@/features/tp/drives/TpDrivesPage'
import ImportPage from '@/features/tp/import/ImportPage'
import TpOverviewPage from '@/features/tp/overview/TpOverviewPage'
import PlacementsPage from '@/features/tp/placements/PlacementsPage'
import AssessmentsPage from '@/features/student/assessments/AssessmentsPage'
import StartPage from '@/features/student/assessments/StartPage'
import TakePage from '@/features/student/assessments/TakePage'
import DrivePage from '@/features/student/drives/DrivePage'
import DrivesPage from '@/features/student/drives/DrivesPage'
import FeedbackPage from '@/features/student/misc/FeedbackPage'
import InterviewsPage from '@/features/student/misc/InterviewsPage'
import OnboardingPage from '@/features/student/onboarding/OnboardingPage'
import CodingPage from '@/features/student/practice/CodingPage'
import ProgressPage from '@/features/student/progress/ProgressPage'
import ResultPage from '@/features/student/results/ResultPage'
import OverviewPage from '@/features/student/overview/OverviewPage'
import ProfilePage from '@/features/student/profile/ProfilePage'
import RoadmapPage from '@/features/student/roadmap/RoadmapPage'
import LessonPage from '@/features/student/training/LessonPage'
import TrackPage from '@/features/student/training/TrackPage'
import ResumePage from '@/features/resume/ResumePage'
import { ROLES } from '@/lib/api/types'

// Development-only catalogue; excluded from production builds.
const DevComponentsPage = import.meta.env.DEV
  ? lazy(() => import('@/features/dev/DevComponentsPage'))
  : null

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* Reachable whether or not someone is signed in: the link comes from an email. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/500" element={<ServerErrorPage />} />

      {DevComponentsPage && (
        <Route
          path="/dev/components"
          element={
            <Suspense fallback={null}>
              <DevComponentsPage />
            </Suspense>
          }
        />
      )}

      {/* Any signed-in role */}
      <Route element={<RequireRole />}>
        <Route element={<AppShell />}>
          <Route path="/settings/account" element={<AccountSettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* One guarded area per role. Screens are added here phase by phase. */}
      {ROLES.map((role) => (
        <Route key={role} element={<RequireRole roles={[role]} />}>
          <Route element={<AppShell />}>
            {role === 'STUDENT' && (
              <>
                <Route path="/s" element={<OverviewPage />} />
                <Route path="/s/onboarding" element={<OnboardingPage />} />
                <Route path="/s/profile" element={<ProfilePage />} />
                <Route path="/s/roadmap" element={<RoadmapPage />} />
                <Route path="/s/training/technical" element={<TrackPage kind="technical" />} />
                <Route
                  path="/s/training/non-technical"
                  element={<TrackPage kind="non-technical" />}
                />
                <Route path="/s/training/:topic/:lesson" element={<LessonPage />} />
                <Route path="/s/practice/coding/:id" element={<CodingPage />} />
                <Route path="/s/assessments" element={<AssessmentsPage />} />
                <Route path="/s/assessments/:id/start" element={<StartPage />} />
                <Route path="/s/assessments/:id/take" element={<TakePage />} />
                <Route path="/s/results/:attemptId" element={<ResultPage />} />
                <Route path="/s/progress" element={<ProgressPage />} />
                <Route path="/s/interviews" element={<InterviewsPage />} />
                <Route path="/s/drives" element={<DrivesPage />} />
                <Route path="/s/drives/:id" element={<DrivePage />} />
                <Route path="/s/feedback" element={<FeedbackPage />} />
                <Route path="/s/resume" element={<ResumePage />} />
                <Route path="/s/resume/:id" element={<AnalysisPage />} />
                <Route path="/s/career" element={<CareerPage />} />
              </>
            )}
            {role === 'FACULTY' && (
              <>
                <Route path="/f" element={<FacultyOverviewPage />} />
                <Route path="/f/students" element={<StudentsPage />} />
                <Route path="/f/students/:id" element={<Student360Page />} />
                <Route path="/f/mentoring" element={<MentoringPage />} />
                <Route path="/f/assessments/new" element={<AssessmentBuilderPage />} />
                <Route path="/f/proctoring" element={<ProctoringPage />} />
                <Route path="/f/questions" element={<QuestionsPage />} />
                <Route path="/f/questions/new" element={<QuestionFormPage />} />
                <Route path="/f/questions/:id" element={<QuestionFormPage />} />
              </>
            )}
            {role === 'ADMIN' && (
              <>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/departments" element={<DepartmentsPage />} />
                <Route path="/admin/roles" element={<RolesPage />} />
                <Route path="/admin/audit" element={<AuditPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </>
            )}
            {role === 'RECRUITER' && (
              <>
                <Route path="/r" element={<RecruiterOverviewPage />} />
                <Route path="/r/drives/:id" element={<RecruiterDrivePage />} />
              </>
            )}
            {role === 'TP_HEAD' && (
              <>
                <Route path="/tp" element={<TpOverviewPage />} />
                <Route path="/tp/analytics" element={<AnalyticsPage />} />
                <Route path="/tp/drives" element={<TpDrivesPage />} />
                <Route path="/tp/drives/new" element={<DriveFormPage />} />
                <Route path="/tp/drives/:id/eligibility" element={<EligibilityPage />} />
                <Route path="/tp/drives/:id/shortlist" element={<ShortlistPage />} />
                <Route path="/tp/academic-import" element={<ImportPage />} />
                <Route path="/tp/placements" element={<PlacementsPage />} />
              </>
            )}
            <Route path={`${ROLE_HOME[role]}/*`} element={<RolePlaceholder />} />
          </Route>
        </Route>
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
