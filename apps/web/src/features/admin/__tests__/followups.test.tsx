import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderScreen } from '@/features/student/__tests__/testing'
import { adminApi } from '@/lib/api/admin-api'
import type { AdminUser, AdminUserPage } from '@/lib/api/admin-types'
import { authApi } from '@/lib/api/auth-api'
import { ApiError } from '@/lib/api/errors'
import AdminOverviewPage from '../overview/AdminOverviewPage'
import RolesPage from '../roles/RolesPage'
import UsersPage from '../users/UsersPage'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/admin-api', () => ({
  adminApi: {
    users: vi.fn(),
    createUser: vi.fn(),
    setStatus: vi.fn(),
    resendInvite: vi.fn(),
    overview: vi.fn(),
    permissions: vi.fn(),
  },
}))
vi.mock('@/lib/api/auth-api', () => ({ authApi: { departments: vi.fn() } }))

const api = vi.mocked(adminApi)

const user = (n: number, overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: `00000000-0000-7000-8000-00000000000${n}`,
  email: `person${n}@college.edu`,
  fullName: `Person ${n}`,
  role: 'RECRUITER',
  status: 'ACTIVE',
  invitePending: false,
  department: null,
  rollNo: null,
  lastLoginAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  ...overrides,
})
const page = (items: AdminUser[]): AdminUserPage => ({
  items,
  page: 0,
  size: 20,
  totalItems: items.length,
  totalPages: 1,
})

beforeEach(() => {
  vi.resetAllMocks()
  toast.mockClear()
  vi.mocked(authApi.departments).mockResolvedValue([])
})

describe('pending invites', () => {
  const pending = user(3, { invitePending: true })

  it('shows Invite pending, and offers a resend only for active accounts that still need one', async () => {
    api.users.mockResolvedValue(
      page([pending, user(4, { invitePending: true, status: 'INACTIVE' }), user(5)]),
    )
    renderScreen(<UsersPage />)
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Invite pending')
    expect(
      within(rows[1]!).getByRole('button', { name: /Resend invite to Person 3/ }),
    ).toBeInTheDocument()
    // Inactive wins over pending, and has no resend until it is activated.
    expect(rows[2]).toHaveTextContent('Inactive')
    expect(
      within(rows[2]!).queryByRole('button', { name: /Resend invite/ }),
    ).not.toBeInTheDocument()
    expect(rows[3]).toHaveTextContent('Active')
    expect(
      within(rows[3]!).queryByRole('button', { name: /Resend invite/ }),
    ).not.toBeInTheDocument()
  })

  it('resends and says the old link stops working', async () => {
    api.users.mockResolvedValue(page([pending]))
    api.resendInvite.mockResolvedValue(pending)
    renderScreen(<UsersPage />)
    // The table and the stacked list are both in the DOM (CSS hides one), so take the first.
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /Resend invite to Person 3/ }))[0]!,
    )
    await waitFor(() => expect(api.resendInvite).toHaveBeenCalled())
    expect(api.resendInvite.mock.calls[0]![0]).toBe(pending.id)
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('The old link no longer works'))
  })

  it('shows an error toast when the email cannot be sent', async () => {
    api.users.mockResolvedValue(page([pending]))
    api.resendInvite.mockRejectedValue(new ApiError({ status: 503, message: 'Mail is down' }))
    renderScreen(<UsersPage />)
    // The table and the stacked list are both in the DOM (CSS hides one), so take the first.
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /Resend invite to Person 3/ }))[0]!,
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('could not be sent')),
    )
  })
})

describe('AdminOverviewPage', () => {
  const overview = {
    totalUsers: 9,
    activeUsers: 7,
    inactiveUsers: 2,
    pendingInvites: 3,
    usersByRole: [
      { role: 'STUDENT' as const, total: 5, active: 5 },
      { role: 'FACULTY' as const, total: 2, active: 1 },
      { role: 'TP_HEAD' as const, total: 0, active: 0 },
      { role: 'RECRUITER' as const, total: 1, active: 1 },
      { role: 'ADMIN' as const, total: 1, active: 1 },
    ],
  }

  it('shows the real counts, users by role and quick links', async () => {
    api.overview.mockResolvedValue(overview)
    renderScreen(<AdminOverviewPage />)
    expect(await screen.findByText('9')).toBeInTheDocument()
    expect(screen.getByText('Invites pending')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Accounts by role' })
    expect(within(table).getByRole('row', { name: /Faculty/ })).toHaveTextContent('2')
    expect(within(table).getByRole('row', { name: /T&P head/ })).toHaveTextContent('0')
    expect(screen.getByRole('link', { name: /Users/ })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: /Departments/ })).toHaveAttribute(
      'href',
      '/admin/departments',
    )
  })

  it('has loading and error states', async () => {
    api.overview.mockReturnValue(new Promise(() => undefined))
    const loading = renderScreen(<AdminOverviewPage />)
    expect(screen.getByRole('status', { name: 'Loading users by role' })).toBeInTheDocument()
    loading.unmount()
    api.overview.mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderScreen(<AdminOverviewPage />)
    expect(await screen.findByText('The overview could not be loaded')).toBeInTheDocument()
  })
})

describe('RolesPage', () => {
  it('shows the matrix the API reports, keeps the read-only note, and spells out public rows', async () => {
    api.permissions.mockResolvedValue({
      roles: [
        { id: 'STUDENT', label: 'Student' },
        { id: 'ADMIN', label: 'Admin' },
      ],
      permissions: [
        {
          id: 'health',
          label: 'See that the service is running',
          group: 'Public',
          access: 'public',
          endpoints: ['/api/v1/health'],
        },
        {
          id: 'admin',
          label: 'Manage accounts',
          group: 'Administration',
          access: 'roles',
          endpoints: ['/api/v1/admin/**'],
        },
      ],
      grants: { health: ['STUDENT', 'ADMIN'], admin: ['ADMIN'] },
    })
    renderScreen(<RolesPage />)
    expect(
      await screen.findByRole('switch', { name: 'Student: Manage accounts, not allowed' }),
    ).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Admin: Manage accounts, allowed' })).toBeChecked()
    expect(
      screen.getByRole('switch', { name: 'Student: See that the service is running, allowed' }),
    ).toBeChecked()
    expect(screen.getByText('Open to everyone, signed in or not')).toBeInTheDocument()
    expect(screen.getByText('/api/v1/admin/**')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Changing permissions is not available yet')
  })

  it('has loading, empty and error states', async () => {
    api.permissions.mockReturnValue(new Promise(() => undefined))
    const loading = renderScreen(<RolesPage />)
    expect(screen.getByRole('status', { name: 'Loading permissions' })).toBeInTheDocument()
    loading.unmount()

    api.permissions.mockResolvedValue({ roles: [], permissions: [], grants: {} })
    const empty = renderScreen(<RolesPage />)
    expect(await screen.findByText('No permissions to show')).toBeInTheDocument()
    empty.unmount()

    api.permissions.mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderScreen(<RolesPage />)
    expect(await screen.findByText('The permission matrix could not be loaded')).toBeInTheDocument()
  })
})
