import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsMenu } from '@/app/NotificationsMenu'
import SetPasswordPage from '@/features/auth/SetPasswordPage'
import { renderScreen, TEST_USER } from '@/features/student/__tests__/testing'
import RecruiterDrivePage from '@/features/recruiter/RecruiterDrivePage'
import RecruiterOverviewPage from '@/features/recruiter/RecruiterOverviewPage'
import { CandidatesTable } from '@/features/recruiter/CandidatesTable'
import NotificationsPage from '@/features/notifications/NotificationsPage'
import { adminApi } from '@/lib/api/admin-api'
import type { AdminUser, AdminUserPage } from '@/lib/api/admin-types'
import { authApi } from '@/lib/api/auth-api'
import { ApiError } from '@/lib/api/errors'
import type { RecruiterCandidate } from '@/lib/api/ops-types'
import AuditPage from '../audit/AuditPage'
import DepartmentsPage from '../departments/DepartmentsPage'
import { departmentSchema } from '../departments/schemas'
import { PermissionGrid } from '../roles/PermissionGrid'
import RolesPage from '../roles/RolesPage'
import { settingsSchema } from '../settings/schemas'
import SettingsPage from '../settings/SettingsPage'
import { createUserSchema } from '../users/schemas'
import UsersPage from '../users/UsersPage'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/admin-api', () => ({
  adminApi: { users: vi.fn(), createUser: vi.fn(), setStatus: vi.fn() },
}))
vi.mock('@/lib/api/auth-api', () => ({
  authApi: { departments: vi.fn(), resetPassword: vi.fn() },
}))

const api = vi.mocked(adminApi)
const fetchMock = vi.fn()

const user = (n: number, overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: `00000000-0000-7000-8000-00000000000${n}`,
  email: `person${n}@college.edu`,
  fullName: `Person ${n}`,
  role: 'FACULTY',
  status: 'ACTIVE',
  department: { id: 'd1', code: 'CSE', name: 'Computer Science' },
  rollNo: null,
  lastLoginAt: null,
  createdAt: '2026-11-01T10:00:00Z',
  ...overrides,
})
const page = (items: AdminUser[], extra: Partial<AdminUserPage> = {}): AdminUserPage => ({
  items,
  page: 0,
  size: 20,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...extra,
})

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  toast.mockClear()
  vi.mocked(authApi.departments).mockResolvedValue([
    { id: 'd1', code: 'CSE', name: 'Computer Science' },
  ])
  api.users.mockResolvedValue(page([user(1), user(2, { status: 'INACTIVE' })]))
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  vi.resetAllMocks()
})

describe('UsersPage', () => {
  it('lists users with role, department and status, and asks the server to filter', async () => {
    renderScreen(<UsersPage />)
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Person 1')
    expect(rows[1]).toHaveTextContent('Faculty')
    expect(rows[1]).toHaveTextContent('CSE')
    expect(rows[1]).toHaveTextContent('Active')
    expect(rows[2]).toHaveTextContent('Inactive')
    expect(rows[1]).toHaveTextContent('Never')
    expect(api.users).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, role: '', status: '', q: '' }),
    )

    await userEvent.type(screen.getByLabelText('Search users'), 'rao')
    await waitFor(() =>
      expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'rao' })),
    )

    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Inactive' }))
    await waitFor(() =>
      expect(api.users).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'INACTIVE', page: 0 }),
      ),
    )
  })

  it('has loading, empty, no-match and error states', async () => {
    api.users.mockReturnValue(new Promise(() => undefined))
    const loading = renderScreen(<UsersPage />)
    expect(screen.getByRole('status', { name: 'Loading users' })).toBeInTheDocument()
    loading.unmount()

    api.users.mockResolvedValue(page([]))
    const empty = renderScreen(<UsersPage />)
    expect(await screen.findByText('No users yet')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Search users'), 'zzz')
    expect(await screen.findByText('No users match these filters.')).toBeInTheDocument()
    empty.unmount()

    api.users.mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderScreen(<UsersPage />)
    expect(await screen.findByText('Users could not be loaded')).toBeInTheDocument()
  })

  it('pages with the server', async () => {
    api.users.mockImplementation(async (f) =>
      page([user(1)], { page: f.page, totalItems: 25, totalPages: 2 }),
    )
    renderScreen(<UsersPage />)
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(api.users).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('deactivates only after a confirmation, and never your own account', async () => {
    api.users.mockResolvedValue(
      page([user(1), user(2, { id: TEST_USER.id, fullName: 'Asha Rao' })]),
    )
    api.setStatus.mockResolvedValue(user(1, { status: 'INACTIVE' }))
    renderScreen(<UsersPage />)
    const table = await screen.findByRole('table')

    const own = within(within(table).getAllByRole('row')[2]!).getByRole('button', {
      name: /Deactivate/,
    })
    expect(own).toBeDisabled()
    expect(own).toHaveAccessibleName(/not allowed for your own account/)

    await userEvent.click(
      within(within(table).getAllByRole('row')[1]!).getByRole('button', { name: /Deactivate/ }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate this account' })
    expect(dialog).toHaveTextContent('signed out on every device straight away')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(api.setStatus).not.toHaveBeenCalled()

    await userEvent.click(
      within(within(table).getAllByRole('row')[1]!).getByRole('button', { name: /Deactivate/ }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' }),
    )
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith(user(1).id, 'INACTIVE'))
    expect(toast).toHaveBeenCalledWith('Person 1 deactivated')
  })

  it('activates an inactive account after a confirmation', async () => {
    api.setStatus.mockResolvedValue(user(2))
    renderScreen(<UsersPage />)
    const table = await screen.findByRole('table')
    await userEvent.click(
      within(within(table).getAllByRole('row')[2]!).getByRole('button', { name: /Activate/ }),
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Activate' }),
    )
    await waitFor(() => expect(api.setStatus).toHaveBeenCalledWith(user(2).id, 'ACTIVE'))
  })

  it('shows an error in the dialog when the change fails', async () => {
    api.setStatus.mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderScreen(<UsersPage />)
    const table = await screen.findByRole('table')
    await userEvent.click(
      within(within(table).getAllByRole('row')[1]!).getByRole('button', { name: /Deactivate/ }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
  })
})

describe('Create user dialog', () => {
  const open = async () => {
    renderScreen(<UsersPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Create user' }))
    return screen.findByRole('dialog', { name: 'Create a staff account' })
  }

  it('has no password field and checks the form before sending', async () => {
    const dialog = await open()
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
    expect(await within(dialog).findByText('Enter the full name')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email address')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose the department')).toBeInTheDocument()
    expect(api.createUser).not.toHaveBeenCalled()
  })

  it('sends staff details, with a department only for faculty', async () => {
    api.createUser.mockResolvedValue(user(3))
    const dialog = await open()
    await userEvent.type(within(dialog).getByLabelText('Full name'), ' Dr Rao ')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'rao@college.edu')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Department' }))
    await userEvent.click(await screen.findByRole('option', { name: /CSE/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(api.createUser).toHaveBeenCalled())
    // TanStack Query passes extra arguments after the variables; only the body matters here.
    expect(api.createUser.mock.calls[0]![0]).toEqual({
      fullName: 'Dr Rao',
      email: 'rao@college.edu',
      role: 'FACULTY',
      departmentId: 'd1',
    })
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('emailed to rao@college.edu'))
  })

  it('hides the department for other roles and does not send one', async () => {
    api.createUser.mockResolvedValue(user(3))
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Recruiter' }))
    expect(within(dialog).queryByRole('combobox', { name: 'Department' })).not.toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Full name'), 'Rec')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'rec@college.edu')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(api.createUser).toHaveBeenCalled())
    // TanStack Query passes extra arguments after the variables; only the body matters here.
    expect(api.createUser.mock.calls[0]![0]).toEqual({
      fullName: 'Rec',
      email: 'rec@college.edu',
      role: 'RECRUITER',
      departmentId: undefined,
    })
  })

  it('shows a server field error and a mail failure', async () => {
    const dialog = await open()
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Admin' }))
    await userEvent.type(within(dialog).getByLabelText('Full name'), 'Dup')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'dup@college.edu')

    api.createUser.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        message: 'x',
        fieldErrors: { email: 'An account with this email already exists.' },
      }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
    expect(
      await within(dialog).findByText('An account with this email already exists.'),
    ).toBeInTheDocument()

    api.createUser.mockRejectedValueOnce(
      new ApiError({ status: 503, message: 'x', code: 'mail_unavailable' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
    expect(await within(dialog).findByText(/so the account was not created/)).toBeInTheDocument()
  })
})

describe('schemas', () => {
  it('createUserSchema needs a department for faculty only', () => {
    const base = { fullName: 'A', email: 'a@college.edu', role: 'FACULTY', departmentId: '' }
    expect(createUserSchema.safeParse(base).success).toBe(false)
    expect(createUserSchema.safeParse({ ...base, departmentId: 'd1' }).success).toBe(true)
    expect(createUserSchema.safeParse({ ...base, role: 'ADMIN' }).success).toBe(true)
    expect(
      createUserSchema.safeParse({ ...base, role: 'STUDENT', departmentId: 'd1' }).success,
    ).toBe(false)
    expect(createUserSchema.safeParse({ ...base, email: 'nope', departmentId: 'd1' }).success).toBe(
      false,
    )
  })

  it('departmentSchema wants a short capital code', () => {
    expect(departmentSchema.safeParse({ code: 'CSE', name: 'Computer Science' }).success).toBe(true)
    expect(departmentSchema.safeParse({ code: 'cse', name: 'Computer Science' }).success).toBe(
      false,
    )
    expect(departmentSchema.safeParse({ code: 'C', name: 'Computer Science' }).success).toBe(false)
    expect(departmentSchema.safeParse({ code: 'CSE', name: 'CS' }).success).toBe(false)
  })

  it('settingsSchema bounds the retention periods and threshold', () => {
    const ok = {
      attemptMonths: '24',
      proctoringDays: '90',
      analysisMonths: '12',
      fullScreenRequired: true,
      tabSwitchLogging: true,
      cameraRequired: false,
      microphoneRequired: false,
      warningThreshold: '3',
    }
    expect(settingsSchema.safeParse(ok).success).toBe(true)
    expect(settingsSchema.safeParse({ ...ok, attemptMonths: '' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...ok, proctoringDays: '3' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...ok, warningThreshold: '11' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...ok, analysisMonths: '1.5' }).success).toBe(false)
  })
})

describe('admin pages without a backend', () => {
  it('departments lists the real ones, and add/edit validate then say saving is unavailable', async () => {
    renderScreen(<DepartmentsPage />)
    expect(await screen.findByText('Computer Science', { selector: 'td' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add department' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add a department' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add department' }))
    expect(await within(dialog).findByText(/Use 2 to 16 capital letters/)).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
    await userEvent.type(within(dialog).getByLabelText('Code'), 'MBA')
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Business Administration')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add department' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })

  it('departments has an error state', async () => {
    vi.mocked(authApi.departments).mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderScreen(<DepartmentsPage />)
    expect(await screen.findByText('Departments could not be loaded')).toBeInTheDocument()
  })

  it('audit log and roles show empty states without a request', () => {
    const a = renderScreen(<AuditPage />)
    expect(screen.getByText('No audit entries yet')).toBeInTheDocument()
    a.unmount()
    renderScreen(<RolesPage />)
    expect(screen.getByText('No permission matrix to show')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'Changes to permissions are not available yet',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('settings validates, shows the policy, and says saving is unavailable', async () => {
    renderScreen(<SettingsPage />)
    expect(
      screen.getByText(/At least 8 characters, with a letter and a number/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    expect((await screen.findAllByText(/as a whole number/)).length).toBeGreaterThan(0)
    expect(toast).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Assessment attempts (months)'), '24')
    await userEvent.type(screen.getByLabelText('Proctoring events (days)'), '90')
    await userEvent.type(screen.getByLabelText('Resume analyses (months)'), '12')
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })

  it('permission grid gives each switch a spoken answer and cannot be changed', () => {
    renderScreen(
      <PermissionGrid
        matrix={{
          roles: [
            { id: 'a', label: 'Admin' },
            { id: 's', label: 'Student' },
          ],
          permissions: [{ id: 'p', label: 'Manage users', group: 'Administration' }],
          grants: { p: ['a'] },
        }}
      />,
    )
    const allowed = screen.getByRole('switch', { name: 'Admin: Manage users, allowed' })
    expect(allowed).toBeChecked()
    expect(allowed).toBeDisabled()
    expect(
      screen.getByRole('switch', { name: 'Student: Manage users, not allowed' }),
    ).not.toBeChecked()
  })
})

describe('recruiter and notifications', () => {
  it('recruiter overview and drive page show empty states and the consent note', () => {
    const a = renderScreen(<RecruiterOverviewPage />)
    expect(screen.getByText('No drives assigned yet')).toBeInTheDocument()
    expect(screen.getByLabelText('Offers made: no data')).toHaveTextContent('—')
    a.unmount()
    renderScreen(<RecruiterDrivePage />, { route: '/r/drives/x', path: '/r/drives/:id' })
    expect(screen.getByText('No approved candidates yet')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'approved, and whose owners agreed to share them',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('candidates: stage updates and resumes say they are unavailable', async () => {
    const candidates: RecruiterCandidate[] = [
      {
        id: 'c',
        name: 'Asha',
        department: 'CSE',
        cgpa: 8.456,
        keySkills: ['Java', 'SQL', 'Go', 'Rust', 'C'],
        stage: 'Online test',
      },
    ]
    renderScreen(<CandidatesTable candidates={candidates} stages={['Online test', 'Interview']} />)
    const table = screen.getByRole('table')
    expect(within(table).getByText('8.46')).toBeInTheDocument()
    expect(within(table).getAllByRole('listitem')).toHaveLength(4) // only the first four skills
    const update = within(table).getByRole('button', { name: /Update stage for Asha/ })
    expect(update).toBeDisabled()
    await userEvent.click(within(table).getByRole('combobox', { name: 'Stage for Asha' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Interview' }))
    expect(update).toBeEnabled()
    await userEvent.click(update)
    expect(toast).toHaveBeenCalledWith("Saving isn't available yet")
    await userEvent.click(within(table).getByRole('button', { name: /View resume for Asha/ }))
    expect(toast).toHaveBeenCalledWith("Viewing a resume isn't available yet")
  })

  it('notifications: All and Unread tabs with empty states, and the bell links here', async () => {
    renderScreen(<NotificationsPage />)
    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark all as read/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('tab', { name: /Unread/ }))
    expect(await screen.findByText('Nothing unread')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    renderScreen(<NotificationsMenu />)
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/notifications',
    )
  })
})

describe('SetPasswordPage', () => {
  it('uses the emailed token and says what happened, and explains an expired link', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue(undefined)
    renderScreen(<SetPasswordPage />, { route: '/set-password?token=abc' })
    expect(screen.getByRole('heading', { name: 'Set your password' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('New password', { exact: true }), 'Chosen123Pass')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Chosen123Pass')
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))
    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: 'abc',
        newPassword: 'Chosen123Pass',
      }),
    )
  })

  it('shows the expired-link message without a token', () => {
    renderScreen(<SetPasswordPage />, { route: '/set-password' })
    expect(screen.getByRole('heading', { name: 'This link is not valid' })).toBeInTheDocument()
    expect(screen.getByText(/expire after 24 hours/)).toBeInTheDocument()
  })
})
