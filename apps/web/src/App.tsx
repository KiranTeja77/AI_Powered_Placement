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
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '@/features/errors/ErrorPages'
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
            <Route path={`${ROLE_HOME[role]}/*`} element={<RolePlaceholder />} />
          </Route>
        </Route>
      ))}

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
