import { Route, Routes } from 'react-router'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import RecruiterDrivePage from '@/features/recruiter/RecruiterDrivePage'
import RecruiterOverviewPage from '@/features/recruiter/RecruiterOverviewPage'

/** Every recruiter screen. Loaded as one chunk, only for recruiters. Paths are relative to /r. */
export default function RecruiterRoutes() {
  return (
    <Routes>
      <Route index element={<RecruiterOverviewPage />} />
      <Route path="drives/:id" element={<RecruiterDrivePage />} />
      <Route path="*" element={<RolePlaceholder />} />
    </Routes>
  )
}
