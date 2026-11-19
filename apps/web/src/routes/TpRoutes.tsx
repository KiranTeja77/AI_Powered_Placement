import { Route, Routes } from 'react-router'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import AnalyticsPage from '@/features/tp/analytics/AnalyticsPage'
import DriveFormPage from '@/features/tp/drives/DriveFormPage'
import EligibilityPage from '@/features/tp/drives/EligibilityPage'
import ShortlistPage from '@/features/tp/drives/ShortlistPage'
import TpDrivesPage from '@/features/tp/drives/TpDrivesPage'
import ImportPage from '@/features/tp/import/ImportPage'
import TpOverviewPage from '@/features/tp/overview/TpOverviewPage'
import PlacementsPage from '@/features/tp/placements/PlacementsPage'

/** Every T&P screen, and the charting library only they use. Paths are relative to /tp. */
export default function TpRoutes() {
  return (
    <Routes>
      <Route index element={<TpOverviewPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="drives" element={<TpDrivesPage />} />
      <Route path="drives/new" element={<DriveFormPage />} />
      <Route path="drives/:id/eligibility" element={<EligibilityPage />} />
      <Route path="drives/:id/shortlist" element={<ShortlistPage />} />
      <Route path="academic-import" element={<ImportPage />} />
      <Route path="placements" element={<PlacementsPage />} />
      <Route path="*" element={<RolePlaceholder />} />
    </Routes>
  )
}
