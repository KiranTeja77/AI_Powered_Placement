import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthContext } from '@/features/auth/auth-context'
import type { User } from '@/lib/api/types'

/** A signed-in student for tests. Never shipped. */
export const TEST_USER: User = {
  id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
  email: 'asha@college.edu',
  fullName: 'Asha Rao',
  role: 'STUDENT',
  status: 'ACTIVE',
  department: { id: 'dept-1', code: 'CSE', name: 'Computer Science' },
  student: { rollNo: '21CS001', graduationYear: 2027 },
}

/** Renders a screen with a router, query client and signed-in student. */
export function renderScreen(ui: ReactElement, { route = '/', path = '*', user = TEST_USER } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          status: 'authenticated',
          user,
          sessionExpired: false,
          login: () => Promise.resolve(user),
          logout: () => Promise.resolve(),
        }}
      >
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
