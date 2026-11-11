import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Role, User } from '@/lib/api/types'
import { AuthContext, type AuthContextValue } from './auth-context'
import { PublicOnly, RequireRole, RootRedirect } from './guards'

const makeUser = (role: Role): User => ({
  id: '1',
  email: 'a@b.c',
  fullName: 'Test User',
  role,
  status: 'ACTIVE',
  department: null,
  student: null,
})

function renderAt(path: string, value: Partial<AuthContextValue>) {
  const ctx: AuthContextValue = {
    status: 'unauthenticated',
    user: null,
    sessionExpired: false,
    login: async () => makeUser('STUDENT'),
    logout: async () => undefined,
    ...value,
  }
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<p>login page</p>} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin" element={<p>admin area</p>} />
          </Route>
          <Route element={<RequireRole />}>
            <Route path="/any" element={<p>any area</p>} />
          </Route>
          <Route path="/s" element={<p>student home</p>} />
          <Route path="/admin-home" element={<p>unused</p>} />
          <Route path="/403" element={<p>forbidden page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('route guards', () => {
  it('shows a loading state while the session is being restored', () => {
    renderAt('/admin', { status: 'loading' })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('sends signed-out visitors to /login', () => {
    renderAt('/admin', {})
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('sends the wrong role to /403', () => {
    renderAt('/admin', { status: 'authenticated', user: makeUser('STUDENT') })
    expect(screen.getByText('forbidden page')).toBeInTheDocument()
  })

  it('lets the right role in', () => {
    renderAt('/admin', { status: 'authenticated', user: makeUser('ADMIN') })
    expect(screen.getByText('admin area')).toBeInTheDocument()
  })

  it('lets any signed-in role into role-agnostic routes', () => {
    renderAt('/any', { status: 'authenticated', user: makeUser('RECRUITER') })
    expect(screen.getByText('any area')).toBeInTheDocument()
  })

  it('moves signed-in users off the login page to their home', () => {
    renderAt('/login', { status: 'authenticated', user: makeUser('STUDENT') })
    expect(screen.getByText('student home')).toBeInTheDocument()
  })

  it('redirects the root to the role home', () => {
    renderAt('/', { status: 'authenticated', user: makeUser('STUDENT') })
    expect(screen.getByText('student home')).toBeInTheDocument()
  })
})
