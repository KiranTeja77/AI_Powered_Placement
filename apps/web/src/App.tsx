import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { PageLoading } from '@/app/PageLoading'
import AccountSettingsPage from '@/features/account/AccountSettingsPage'
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage'
import { PublicOnly, RequireRole, RootRedirect } from '@/features/auth/guards'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import ResetPasswordPage from '@/features/auth/ResetPasswordPage'
import { ROLE_HOME } from '@/features/auth/roles'
import SetPasswordPage from '@/features/auth/SetPasswordPage'
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '@/features/errors/ErrorPages'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import { ROLES, type Role } from '@/lib/api/types'

// Each role's screens are downloaded only when someone of that role gets that far, so a student
// never fetches the admin screens, or the charting library behind the T&P ones.
const AREAS: Record<Role, LazyExoticComponent<ComponentType>> = {
  STUDENT: lazy(() => import('@/routes/StudentRoutes')),
  FACULTY: lazy(() => import('@/routes/FacultyRoutes')),
  TP_HEAD: lazy(() => import('@/routes/TpRoutes')),
  ADMIN: lazy(() => import('@/routes/AdminRoutes')),
  RECRUITER: lazy(() => import('@/routes/RecruiterRoutes')),
}

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

      {/* One guarded area per role; its own screens are lazy and routed inside it. */}
      {ROLES.map((role) => {
        const Area = AREAS[role]
        return (
          <Route key={role} element={<RequireRole roles={[role]} />}>
            <Route element={<AppShell />}>
              <Route
                path={`${ROLE_HOME[role]}/*`}
                element={
                  <Suspense fallback={<PageLoading />}>
                    <Area />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        )
      })}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
