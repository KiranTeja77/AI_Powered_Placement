import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '@/lib/api/auth-api'
import { resumeApi } from '@/lib/api/resume-api'
import { ROLES } from '@/features/resume/__tests__/support'
import { formatClock, formatMinutes, percent } from '../common/format'
import OnboardingPage from '../onboarding/OnboardingPage'
import OverviewPage from '../overview/OverviewPage'
import ProfilePage from '../profile/ProfilePage'
import { basicsSchema, educationSchema, profileSchema } from '../profile/schemas'
import { renderScreen } from './testing'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/auth-api', () => ({ authApi: { departments: vi.fn() } }))
vi.mock('@/lib/api/resume-api', () => ({
  resumeApi: {
    roles: vi.fn(),
    careerInterests: vi.fn(),
    saveCareerInterests: vi.fn(),
    analyses: vi.fn(),
    analyze: vi.fn(),
  },
}))

const auth = vi.mocked(authApi)
const resume = vi.mocked(resumeApi)

beforeEach(() => {
  vi.resetAllMocks()
  toast.mockClear()
  auth.departments.mockResolvedValue([{ id: 'dept-1', code: 'CSE', name: 'Computer Science' }])
  resume.roles.mockResolvedValue(ROLES)
  resume.careerInterests.mockResolvedValue({ roleSlugs: [] })
  resume.analyses.mockResolvedValue({ items: [], page: 0, size: 10, totalItems: 0, totalPages: 0 })
})

describe('schemas', () => {
  it('basics needs a department and a sensible year', () => {
    expect(basicsSchema.safeParse({ departmentId: '', graduationYear: 2027 }).success).toBe(false)
    expect(basicsSchema.safeParse({ departmentId: 'd', graduationYear: 1999 }).success).toBe(false)
    expect(basicsSchema.safeParse({ departmentId: 'd', graduationYear: 2027 }).success).toBe(true)
  })

  it('education bounds CGPA and percentages', () => {
    const ok = { degree: 'B.Tech', institution: 'Our College', cgpa: 8.4, twelfthPercent: 91 }
    expect(educationSchema.safeParse(ok).success).toBe(true)
    expect(educationSchema.safeParse({ ...ok, cgpa: 11 }).success).toBe(false)
    expect(educationSchema.safeParse({ ...ok, twelfthPercent: -1 }).success).toBe(false)
    expect(educationSchema.safeParse({ ...ok, degree: '  ' }).success).toBe(false)
  })

  it('profile allows empty optional fields but checks them when filled', () => {
    const base = {
      fullName: 'Asha',
      departmentId: 'd',
      graduationYear: 2027,
      phone: '',
      linkedin: '',
      github: '',
    }
    expect(profileSchema.safeParse(base).success).toBe(true)
    expect(profileSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...base, phone: '9876543210' }).success).toBe(true)
    expect(profileSchema.safeParse({ ...base, github: 'http://x.io/a' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...base, github: 'https://github.com/asha' }).success).toBe(
      true,
    )
  })
})

describe('format helpers', () => {
  it('formats clocks, minutes and percentages', () => {
    expect(formatClock(125)).toBe('2:05')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-4)).toBe('0:00')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h')
    expect(percent(1, 3)).toBe(33)
    expect(percent(0, 0)).toBe(0)
  })
})

describe('OverviewPage', () => {
  it('shows dashes and empty states for everything without a backend, and real completeness', async () => {
    renderScreen(<OverviewPage />)
    expect(screen.getByText('No tasks this week')).toBeInTheDocument()
    expect(screen.getByText('No scores yet')).toBeInTheDocument()
    expect(screen.getByText('No upcoming drives')).toBeInTheDocument()
    expect(screen.getByLabelText('Latest score: no data')).toHaveTextContent('—')
    expect(screen.getByLabelText('Tasks done this week: no data')).toHaveTextContent('—')
    // Account and department are known from the signed-in user; interests and resume are not done.
    expect((await screen.findAllByText('2 of 5')).length).toBeGreaterThan(0)
    expect(screen.getByText('Academic record')).toBeInTheDocument()
  })

  it('counts saved interests and analyses as complete', async () => {
    resume.careerInterests.mockResolvedValue({ roleSlugs: ['backend-developer'] })
    resume.analyses.mockResolvedValue({
      items: [],
      page: 0,
      size: 10,
      totalItems: 3,
      totalPages: 1,
    })
    renderScreen(<OverviewPage />)
    expect((await screen.findAllByText('4 of 5')).length).toBeGreaterThan(0)
  })
})

describe('ProfilePage', () => {
  it('prefills from the account and validates before saying saving is unavailable', async () => {
    renderScreen(<ProfilePage />)
    expect(screen.getByLabelText('Full name')).toHaveValue('Asha Rao')
    expect(screen.getByLabelText('Roll number')).toHaveValue('21CS001')
    expect(screen.getByLabelText('Roll number')).toHaveAttribute('readonly')
    expect(screen.getByText('No academic record yet')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Mobile number'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Enter a 10-digit mobile number')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Mobile number'))
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
  })
})

describe('OnboardingPage', () => {
  it('walks the four steps, validating the first two and saving the interests for real', async () => {
    resume.saveCareerInterests.mockResolvedValue({ roleSlugs: ['data-analyst'] })
    renderScreen(<OnboardingPage />)
    expect(screen.getByText('Step 1 of 4: Department and year')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    // Prefilled from the account, so it passes and says saving is unavailable.
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Saving isn't available yet"))
    expect(await screen.findByText('Step 2 of 4: Education')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Enter your degree')).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 4: Education')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Degree'), 'B.Tech')
    await userEvent.type(screen.getByLabelText('College'), 'Our College')
    await userEvent.type(screen.getByLabelText('CGPA'), '8.4')
    await userEvent.type(screen.getByLabelText('12th percentage'), '91')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Step 3 of 4: Career interests')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Data Analyst' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() => expect(resume.saveCareerInterests).toHaveBeenCalledWith(['data-analyst']))

    expect(await screen.findByText('Step 4 of 4: Resume')).toBeInTheDocument()
    expect(screen.getByLabelText('Resume text')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finish without analyzing' })).toBeInTheDocument()
  })
})
