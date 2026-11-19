import { Route, Routes } from 'react-router'
import { RolePlaceholder } from '@/app/RolePlaceholder'
import AuditPage from '@/features/admin/audit/AuditPage'
import DepartmentsPage from '@/features/admin/departments/DepartmentsPage'
import AdminOverviewPage from '@/features/admin/overview/AdminOverviewPage'
import RolesPage from '@/features/admin/roles/RolesPage'
import SettingsPage from '@/features/admin/settings/SettingsPage'
import UsersPage from '@/features/admin/users/UsersPage'

/** Every admin screen. Loaded as one chunk, only for admins. Paths are relative to /admin. */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverviewPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="departments" element={<DepartmentsPage />} />
      <Route path="roles" element={<RolesPage />} />
      <Route path="audit" element={<AuditPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<RolePlaceholder />} />
    </Routes>
  )
}
