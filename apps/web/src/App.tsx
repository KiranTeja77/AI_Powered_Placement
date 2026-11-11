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
import { ROLE_HOME } from '@/features/auth/roles'
import CareerPage from '@/features/career/CareerPage'
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '@/features/errors/ErrorPages'
import AnalysisPage from '@/features/resume/AnalysisPage'
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
          <Route path="/notifications" element={<RolePlaceholder title="Notifications" />} />
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
            <Route path={`${ROLE_HOME[role]}/*`} element={<RolePlaceholder />} />
          </Route>
        </Route>
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
