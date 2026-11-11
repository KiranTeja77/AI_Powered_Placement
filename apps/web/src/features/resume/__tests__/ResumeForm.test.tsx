import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { resumeApi } from '@/lib/api/resume-api'
import { ResumeForm } from '../ResumeForm'
import { makeDetail, renderWithProviders, ROLES } from './support'

vi.mock('@/lib/api/resume-api', () => ({
  resumeApi: { roles: vi.fn(), analyze: vi.fn() },
}))

const api = vi.mocked(resumeApi)
const RESUME = 'Python and SQL projects. '.repeat(12)

beforeEach(() => {
  vi.resetAllMocks()
  api.roles.mockResolvedValue(ROLES)
})

async function typeResume(text = RESUME) {
  const box = screen.getByLabelText('Resume text')
  await userEvent.click(box)
  await userEvent.paste(text)
}

describe('ResumeForm', () => {
  it('counts characters live and says how many more are needed', async () => {
    renderWithProviders(<ResumeForm />)
    expect(screen.getByText('0 of 20,000 characters')).toBeInTheDocument()
    expect(screen.getByText('200 more characters needed')).toBeInTheDocument()

    await typeResume('x'.repeat(150))
    expect(screen.getByText('150 of 20,000 characters')).toBeInTheDocument()
    expect(screen.getByText('50 more characters needed')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Resume text'), 'y'.repeat(60))
    expect(screen.getByText('Ready to analyze')).toBeInTheDocument()
  })

  it('refuses to submit text that is too short and explains why', async () => {
    renderWithProviders(<ResumeForm />)
    await typeResume('Too short')
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))

    expect(await screen.findByText('Use at least 200 characters')).toBeInTheDocument()
    expect(screen.getByLabelText('Resume text')).toHaveAttribute('aria-invalid', 'true')
    expect(api.analyze).not.toHaveBeenCalled()
  })

  it('asks for text when the box is empty', async () => {
    renderWithProviders(<ResumeForm />)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))
    expect(await screen.findByText('Paste your resume text')).toBeInTheDocument()
  })

  it('flags text over the limit', async () => {
    renderWithProviders(<ResumeForm />)
    await typeResume('a'.repeat(20_010))
    expect(screen.getByText('10 over the limit')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))
    expect(await screen.findByText('Use 20,000 characters or fewer')).toBeInTheDocument()
    expect(api.analyze).not.toHaveBeenCalled()
  })

  it('loads the roles and sends the chosen ones with the text', async () => {
    api.analyze.mockResolvedValue(makeDetail())
    renderWithProviders(<ResumeForm />)
    await typeResume()

    await userEvent.click(await screen.findByRole('button', { name: 'Target roles' }))
    await userEvent.click(await screen.findByRole('option', { name: /Backend Developer/ }))
    await userEvent.keyboard('{Escape}')
    const selected = screen.getByRole('list', { name: 'Selected roles' })
    expect(within(selected).getByText('Backend Developer')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))
    await waitFor(() => expect(api.analyze).toHaveBeenCalledTimes(1))
    expect(api.analyze.mock.calls[0]?.[0]).toEqual({
      text: RESUME,
      targetRoles: ['backend-developer'],
    })
    expect(await screen.findByText('analysis page')).toBeInTheDocument()
  })

  it('sends an empty role list to compare with every role', async () => {
    api.analyze.mockResolvedValue(makeDetail())
    renderWithProviders(<ResumeForm />)
    await typeResume()
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))
    await waitFor(() => expect(api.analyze).toHaveBeenCalled())
    expect(api.analyze.mock.calls[0]?.[0].targetRoles).toEqual([])
  })

  it('shows a friendly message when the analyzer is down and keeps the text', async () => {
    api.analyze.mockRejectedValue(
      new ApiError({
        status: 503,
        message: 'Resume analysis is temporarily unavailable.',
        code: 'analysis_unavailable',
      }),
    )
    renderWithProviders(<ResumeForm />)
    await typeResume()
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Resume analysis is temporarily unavailable.')
    expect(alert).toHaveTextContent('Your text is still here')
    expect(screen.getByLabelText('Resume text')).toHaveValue(RESUME)
    expect(screen.getByRole('button', { name: 'Analyze resume' })).toBeEnabled()
  })

  it('shows field errors returned by the server next to the field', async () => {
    api.analyze.mockRejectedValue(
      new ApiError({
        status: 400,
        message: 'Some fields are not valid.',
        fieldErrors: { targetRoles: 'Unknown role: nope' },
      }),
    )
    renderWithProviders(<ResumeForm />)
    await typeResume()
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))
    expect(await screen.findByText('Unknown role: nope')).toBeInTheDocument()
  })

  it('disables the form and shows progress while analyzing', async () => {
    let finish: (value: ReturnType<typeof makeDetail>) => void = () => undefined
    api.analyze.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderWithProviders(<ResumeForm />)
    await typeResume()
    await userEvent.click(screen.getByRole('button', { name: 'Analyze resume' }))

    expect(await screen.findByRole('button', { name: 'Analyzing resume' })).toBeDisabled()
    expect(screen.getByLabelText('Resume text')).toBeDisabled()
    finish(makeDetail())
    expect(await screen.findByText('analysis page')).toBeInTheDocument()
  })

  it('offers a retry when the roles cannot be loaded, and still lets the student analyze', async () => {
    api.roles
      .mockRejectedValueOnce(new ApiError({ status: 500, message: 'x' }))
      .mockResolvedValue(ROLES)
    renderWithProviders(<ResumeForm />)
    expect(await screen.findByText('Roles could not be loaded')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Target roles' })).toBeInTheDocument()
  })
})
