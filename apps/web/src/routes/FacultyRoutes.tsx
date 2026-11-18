import { Route, Routes } from 'react-router'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import AssessmentBuilderPage from '@/features/faculty/assessments/AssessmentBuilderPage'
import MentoringPage from '@/features/faculty/mentoring/MentoringPage'
import FacultyOverviewPage from '@/features/faculty/overview/FacultyOverviewPage'
import ProctoringPage from '@/features/faculty/proctoring/ProctoringPage'
import QuestionFormPage from '@/features/faculty/questions/QuestionFormPage'
import QuestionsPage from '@/features/faculty/questions/QuestionsPage'
import Student360Page from '@/features/faculty/students/Student360Page'
import StudentsPage from '@/features/faculty/students/StudentsPage'

/** Every faculty screen. Loaded as one chunk, only for faculty. Paths are relative to /f. */
export default function FacultyRoutes() {
  return (
    <Routes>
      <Route index element={<FacultyOverviewPage />} />
      <Route path="students" element={<StudentsPage />} />
      <Route path="students/:id" element={<Student360Page />} />
      <Route path="mentoring" element={<MentoringPage />} />
      <Route path="assessments/new" element={<AssessmentBuilderPage />} />
      <Route path="proctoring" element={<ProctoringPage />} />
      <Route path="questions" element={<QuestionsPage />} />
      <Route path="questions/new" element={<QuestionFormPage />} />
      <Route path="questions/:id" element={<QuestionFormPage />} />
      <Route path="*" element={<RolePlaceholder />} />
    </Routes>
  )
}
