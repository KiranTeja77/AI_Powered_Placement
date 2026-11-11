import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { resumeApi } from '@/lib/api/resume-api'
import AnalysisPage from '../AnalysisPage'
import { makeDetail, renderWithProviders } from './support'

vi.mock('@/lib/api/resume-api', () => ({
  resumeApi: { analysis: vi.fn(), updateSkills: vi.fn(), skills: vi.fn() },
}))

const api = vi.mocked(resumeApi)
const ID = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b'

function renderPage() {
  return renderWithProviders(<AnalysisPage />, { route: `/s/resume/${ID}`, path: '/s/resume/:id' })
}

beforeEach(() => {
  vi.resetAllMocks()
  api.analysis.mockResolvedValue(makeDetail())
})

describe('AnalysisPage results', () => {
  it('shows a loading state first', () => {
    api.analysis.mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading analysis' })).toBeInTheDocument()
  })

  it('shows readiness as a percentage with the breakdown behind it, never the number alone', async () => {
    renderPage()
    const role = await screen.findByRole('article', { name: 'Backend Developer' })
    expect(within(role).getByText('30.8%')).toBeInTheDocument()
    expect(within(role).getByText('8 of 26 points available')).toBeInTheDocument()

    const table = within(role).getByRole('table', { name: 'Breakdown for Backend Developer' })
    expect(within(table).getByRole('row', { name: /Core/ })).toHaveTextContent('0 of 3')
    expect(within(table).getByRole('row', { name: /Important/ })).toHaveTextContent('2 of 4')
    expect(within(table).getByRole('row', { name: /Bonus/ })).toHaveTextContent('0.5 of 1')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Skills the role needs', 'Matched', 'Partial', 'Possible', 'Missing', 'Points'])
  })

  it('explains how the score is worked out', async () => {
    renderPage()
    expect(await screen.findByText(/A core skill is worth 3\s+points/)).toBeInTheDocument()
  })

  it('lists each skill with its grade and the evidence highlighted', async () => {
    renderPage()
    const skills = await screen.findByRole('region', { name: 'Skills in your resume' })

    const docker = within(skills)
      .getByText('Docker', { selector: 'span.font-medium' })
      .closest('li') as HTMLElement
    expect(within(docker).getByText('Applied')).toBeInTheDocument()
    expect(within(docker).getByText('2 mentions')).toBeInTheDocument()
    expect(within(docker).getByText('Docker', { selector: 'mark' })).toBeInTheDocument()

    const python = within(skills)
      .getByText('Python', { selector: 'span.font-medium' })
      .closest('li') as HTMLElement
    expect(within(python).getByText('Listed')).toBeInTheDocument()
  })

  it('groups skills by category', async () => {
    renderPage()
    const skills = await screen.findByRole('region', { name: 'Skills in your resume' })
    const headings = within(skills)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(headings).toEqual(['Cloud and DevOps', 'Programming languages'])
  })

  it('shows a possible match as unconfirmed, with how close it was', async () => {
    renderPage()
    const row = (await screen.findByText('Kubernetes', { selector: 'span.font-medium' })).closest(
      'li',
    ) as HTMLElement
    expect(within(row).getByText('Possible, 95% similar')).toBeInTheDocument()
    expect(within(row).getByText('Kubernets', { selector: 'mark' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Confirm Kubernetes' })).toBeInTheDocument()
    expect(screen.getByText(/2 skills found, 1 possible match to confirm/)).toBeInTheDocument()
  })

  it('shows every suggestion with its priority and reason', async () => {
    renderPage()
    expect(await screen.findByText('Learn REST API and show it in a project.')).toBeInTheDocument()
    expect(screen.getByText('High priority')).toBeInTheDocument()
    expect(screen.getByText('Low priority')).toBeInTheDocument()
    expect(screen.getAllByText('Reason:')).toHaveLength(2)
    expect(screen.getByText(/was not found in your resume/)).toBeInTheDocument()
  })

  it('lists the facts that were read from the resume', async () => {
    renderPage()
    await screen.findByRole('article', { name: 'Backend Developer' })
    await userEvent.click(screen.getByText('What was read from your resume'))
    expect(screen.getByText('kiran@x.test')).toBeInTheDocument()
    expect(screen.getByText('8.5 out of 10')).toBeInTheDocument()
    expect(screen.getByText(/Portal App/)).toBeInTheDocument()
  })

  it('shows a clear message when the analysis does not exist or is not the student’s', async () => {
    api.analysis.mockRejectedValue(new ApiError({ status: 403, message: 'No access' }))
    renderPage()
    expect(await screen.findByText('Analysis not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the resume analyzer' })).toHaveAttribute(
      'href',
      '/s/resume',
    )
  })

  it('shows an error with a retry when loading fails', async () => {
    api.analysis.mockRejectedValueOnce(new ApiError({ status: 500, message: 'Server is down' }))
    renderPage()
    expect(await screen.findByText('This analysis could not be loaded')).toBeInTheDocument()
    api.analysis.mockResolvedValue(makeDetail())
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('article', { name: 'Backend Developer' })).toBeInTheDocument()
  })
})

describe('AnalysisPage editing', () => {
  it('has no edit bar until something changes', async () => {
    renderPage()
    await screen.findByRole('article', { name: 'Backend Developer' })
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('removes a skill, saves it, and shows the recomputed gap', async () => {
    const saved = makeDetail({
      updatedAt: '2026-11-11T06:00:00Z',
      edits: {
        confirmedSkillIds: [],
        removedSkillIds: ['python'],
        addedSkillIds: [],
        updatedAt: '2026-11-11T06:00:00Z',
      },
    })
    saved.effective.roles[0]!.score = 24.5
    api.updateSkills.mockResolvedValue(saved)
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Python' }))
    expect(screen.getByText('Removed, not saved')).toBeInTheDocument()
    expect(screen.getByText('You have unsaved changes to the skill list.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateSkills).toHaveBeenCalledTimes(1))
    expect(api.updateSkills).toHaveBeenCalledWith(ID, {
      confirmedSkillIds: [],
      removedSkillIds: ['python'],
      addedSkillIds: [],
    })

    // The page now shows the saved state and the new score.
    expect(await screen.findByText('24.5%')).toBeInTheDocument()
    expect(screen.getByText(/Recalculated with your changes/)).toBeInTheDocument()
    expect(screen.getByText('Removed by you')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset to analyzer result' })).toBeInTheDocument()
    expect(screen.getByText(/Suggestions follow the analyzer/)).toBeInTheDocument()
  })

  it('confirms a possible match', async () => {
    api.updateSkills.mockResolvedValue(makeDetail({ updatedAt: '2026-11-11T06:05:00Z' }))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm Kubernetes' }))
    expect(screen.getByText('Confirmed, not saved')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateSkills).toHaveBeenCalled())
    expect(api.updateSkills.mock.calls[0]?.[1]).toEqual({
      confirmedSkillIds: ['kubernetes'],
      removedSkillIds: [],
      addedSkillIds: [],
    })
  })

  it('adds a skill from the skill list', async () => {
    api.skills.mockResolvedValue([
      { slug: 'typescript', name: 'TypeScript', category: 'Programming languages' },
      { slug: 'docker', name: 'Docker', category: 'Cloud and DevOps' },
    ])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Add a skill' }))
    // Docker is already in the analysis, so only TypeScript can be added.
    expect(await screen.findByRole('option', { name: 'TypeScript' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Docker' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'TypeScript' }))

    expect(screen.getByText('Added, not saved')).toBeInTheDocument()
    expect(screen.getByText(/Counts as listed: no evidence in the text/)).toBeInTheDocument()
  })

  it('undoes an edit and discards unsaved changes', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Python' }))
    await userEvent.click(screen.getByRole('button', { name: 'Undo Python' }))
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Python' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(screen.queryByText('Removed, not saved')).not.toBeInTheDocument()
    expect(api.updateSkills).not.toHaveBeenCalled()
  })

  it('keeps the changes and explains when the analyzer is down while saving', async () => {
    api.updateSkills.mockRejectedValue(
      new ApiError({ status: 503, message: 'Resume analysis is temporarily unavailable.' }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Python' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('temporarily unavailable')
    expect(alert).toHaveTextContent('Your changes are still here')
    expect(screen.getByText('Removed, not saved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('resets a saved analysis to the analyzer result', async () => {
    const saved = makeDetail({
      edits: {
        confirmedSkillIds: [],
        removedSkillIds: ['python'],
        addedSkillIds: [],
        updatedAt: '2026-11-11T06:00:00Z',
      },
    })
    api.analysis.mockResolvedValue(saved)
    api.updateSkills.mockResolvedValue(makeDetail({ updatedAt: '2026-11-11T07:00:00Z' }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Reset to analyzer result' }))
    await waitFor(() => expect(api.updateSkills).toHaveBeenCalledTimes(1))
    expect(api.updateSkills).toHaveBeenCalledWith(ID, {
      confirmedSkillIds: [],
      removedSkillIds: [],
      addedSkillIds: [],
    })
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Reset to analyzer result' }),
      ).not.toBeInTheDocument(),
    )
  })
})
