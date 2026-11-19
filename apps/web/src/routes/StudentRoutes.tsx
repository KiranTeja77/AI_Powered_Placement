import { Route, Routes } from 'react-router'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import CareerPage from '@/features/career/CareerPage'
import AnalysisPage from '@/features/resume/AnalysisPage'
import ResumePage from '@/features/resume/ResumePage'
import AssessmentsPage from '@/features/student/assessments/AssessmentsPage'
import StartPage from '@/features/student/assessments/StartPage'
import TakePage from '@/features/student/assessments/TakePage'
import DrivePage from '@/features/student/drives/DrivePage'
import DrivesPage from '@/features/student/drives/DrivesPage'
import FeedbackPage from '@/features/student/misc/FeedbackPage'
import InterviewsPage from '@/features/student/misc/InterviewsPage'
import OnboardingPage from '@/features/student/onboarding/OnboardingPage'
import OverviewPage from '@/features/student/overview/OverviewPage'
import CodingPage from '@/features/student/practice/CodingPage'
import ProfilePage from '@/features/student/profile/ProfilePage'
import ProgressPage from '@/features/student/progress/ProgressPage'
import ResultPage from '@/features/student/results/ResultPage'
import RoadmapPage from '@/features/student/roadmap/RoadmapPage'
import LessonPage from '@/features/student/training/LessonPage'
import TrackPage from '@/features/student/training/TrackPage'

/** Every student screen. Loaded as one chunk, only for students. Paths are relative to /s. */
export default function StudentRoutes() {
  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="roadmap" element={<RoadmapPage />} />
      <Route path="training/technical" element={<TrackPage kind="technical" />} />
      <Route path="training/non-technical" element={<TrackPage kind="non-technical" />} />
      <Route path="training/:topic/:lesson" element={<LessonPage />} />
      <Route path="practice/coding/:id" element={<CodingPage />} />
      <Route path="assessments" element={<AssessmentsPage />} />
      <Route path="assessments/:id/start" element={<StartPage />} />
      <Route path="assessments/:id/take" element={<TakePage />} />
      <Route path="results/:attemptId" element={<ResultPage />} />
      <Route path="progress" element={<ProgressPage />} />
      <Route path="interviews" element={<InterviewsPage />} />
      <Route path="drives" element={<DrivesPage />} />
      <Route path="drives/:id" element={<DrivePage />} />
      <Route path="feedback" element={<FeedbackPage />} />
      <Route path="resume" element={<ResumePage />} />
      <Route path="resume/:id" element={<AnalysisPage />} />
      <Route path="career" element={<CareerPage />} />
      <Route path="*" element={<RolePlaceholder />} />
    </Routes>
  )
}
