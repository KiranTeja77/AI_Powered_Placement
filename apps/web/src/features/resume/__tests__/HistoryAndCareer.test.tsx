import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CareerPage from '@/features/career/CareerPage'
import { ApiError } from '@/lib/api/errors'
import { resumeApi } from '@/lib/api/resume-api'
import type { AnalysisSummary, Page } from '@/lib/api/resume-types'
import { HistoryTable } from '../HistoryTable'
import { renderWithProviders, ROLES } from './support'

vi.mock('@/lib/api/resume-api', () => ({
  resumeApi: {
    analyses: vi.fn(),
    roles: vi.fn(),
    deleteAnalysis: vi.fn(),
    careerInterests: vi.fn(),
    saveCareerInterests: vi.fn(),
  },
}))

const api = vi.mocked(resumeApi)

const row = (n: number, overrides: Partial<AnalysisSummary> = {}): AnalysisSummary => ({
  id: `00000000-0000-7000-8000-00000000000${n}`,
  createdAt: '2026-11-11T05:30:00Z',
  targetRoles: [{ slug: 'backend-developer', name: 'Backend Developer' }],
  topRole: { slug: 'backend-developer', name: 'Backend Developer' },
  topScore: 47.1,
  skillCount: 28,
  edited: false,
  engineVersion: '1.0.0',
  ...overrides,
})

const page = (
  items: AnalysisSummary[],
  extra: Partial<Page<AnalysisSummary>> = {},
): Page<AnalysisSummary> => ({
  items,
  page: 0,
  size: 10,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
  ...extra,
})

beforeEach(() => {
  vi.resetAllMocks()
  api.careerInterests.mockResolvedValue({ roleSlugs: [] })
})

describe('HistoryTable', () => {
  it('shows a loading state, then the rows', async () => {
    api.analyses.mockResolvedValue(page([row(1)]))
    renderWithProviders(<HistoryTable />)
    expect(screen.getByRole('status', { name: 'Loading past analyses' })).toBeInTheDocument()
    expect(await screen.findAllByText('47.1%')).not.toHaveLength(0)
  })

  it('shows the date, roles, best match, readiness and skill count with a link to open it', async () => {
    api.analyses.mockResolvedValue(
      page([row(1), row(2, { targetRoles: [], edited: true, topScore: 62.5 })]),
    )
    renderWithProviders(<HistoryTable />)
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('Backend Developer')
    expect(rows[1]).toHaveTextContent('47.1%')
    expect(rows[1]).toHaveTextContent('28')
    expect(rows[2]).toHaveTextContent('All roles')
    expect(rows[2]).toHaveTextContent('Edited')
    expect(within(rows[1]!).getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/s/resume/00000000-0000-7000-8000-000000000001',
    )
  })

  it('has a designed empty state', async () => {
    api.analyses.mockResolvedValue(page([]))
    renderWithProviders(<HistoryTable />)
    expect(await screen.findByText('No analyses yet')).toBeInTheDocument()
    expect(screen.getByText(/will appear here after you analyze a resume/)).toBeInTheDocument()
  })

  it('has a designed error state with a retry', async () => {
    api.analyses.mockRejectedValueOnce(new ApiError({ status: 500, message: 'x' }))
    renderWithProviders(<HistoryTable />)
    expect(await screen.findByText('Past analyses could not be loaded')).toBeInTheDocument()
    api.analyses.mockResolvedValue(page([row(1)]))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('pages through the history', async () => {
    api.analyses.mockImplementation(async (p) =>
      page([row(p + 1)], { page: p, totalItems: 12, totalPages: 2 }),
    )
    renderWithProviders(<HistoryTable />)
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    expect(api.analyses).toHaveBeenLastCalledWith(1, 10)
  })
})

describe('CareerPage', () => {
  it('lists the roles, and shows the skills by importance when one is opened', async () => {
    api.roles.mockResolvedValue(ROLES)
    renderWithProviders(<CareerPage />)
    expect(await screen.findByText('Backend Developer')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /Backend Developer/, expanded: false })
    await userEvent.click(toggle)
    const opened = document.getElementById(toggle.getAttribute('aria-controls')!) as HTMLElement
    expect(within(opened).getByRole('heading', { name: /Core/ })).toBeInTheDocument()
    expect(within(opened).getByText('REST API')).toBeInTheDocument()
    expect(within(opened).getByText('Apache Kafka')).toBeInTheDocument()
  })

  it('filters by search and says when nothing matches', async () => {
    api.roles.mockResolvedValue(ROLES)
    renderWithProviders(<CareerPage />)
    await screen.findByText('Backend Developer')
    await userEvent.type(screen.getByLabelText('Search roles'), 'analyst')
    expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument()
    expect(screen.getByText('Data Analyst')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Search roles'))
    await userEvent.type(screen.getByLabelText('Search roles'), 'zzzz')
    expect(screen.getByText('No roles match your search.')).toBeInTheDocument()
  })

  it('has loading, empty and error states', async () => {
    api.roles.mockReturnValue(new Promise(() => undefined))
    const { unmount } = renderWithProviders(<CareerPage />)
    expect(screen.getByRole('status', { name: 'Loading roles' })).toBeInTheDocument()
    unmount()

    api.roles.mockResolvedValue([])
    const empty = renderWithProviders(<CareerPage />)
    expect(await screen.findByText('No roles yet')).toBeInTheDocument()
    empty.unmount()

    api.roles.mockRejectedValue(new ApiError({ status: 500, message: 'x' }))
    renderWithProviders(<CareerPage />)
    expect(await screen.findByText('Roles could not be loaded')).toBeInTheDocument()
  })
})

describe('CareerPage interests', () => {
  it('marks a role as an interest and saves the whole list', async () => {
    api.roles.mockResolvedValue(ROLES)
    api.saveCareerInterests.mockResolvedValue({ roleSlugs: ['data-analyst'] })
    renderWithProviders(<CareerPage />)
    const button = await screen.findByRole('button', { name: /Mark as interest in Data Analyst/ })
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)
    await waitFor(() => expect(api.saveCareerInterests).toHaveBeenCalledWith(['data-analyst']))
    expect(
      await screen.findByRole('button', { name: /Remove interest in Data Analyst/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Interested')).toBeInTheDocument()
  })

  it('shows saved interests and removes one', async () => {
    api.roles.mockResolvedValue(ROLES)
    api.careerInterests.mockResolvedValue({ roleSlugs: ['backend-developer', 'data-analyst'] })
    api.saveCareerInterests.mockResolvedValue({ roleSlugs: ['data-analyst'] })
    renderWithProviders(<CareerPage />)
    const remove = await screen.findByRole('button', {
      name: /Remove interest in Backend Developer/,
    })
    expect(screen.getAllByText('Interested')).toHaveLength(2)
    await userEvent.click(remove)
    await waitFor(() => expect(api.saveCareerInterests).toHaveBeenCalledWith(['data-analyst']))
  })

  it('cannot change interests that failed to load, and offers a retry', async () => {
    api.roles.mockResolvedValue(ROLES)
    api.careerInterests.mockRejectedValueOnce(new ApiError({ status: 500, message: 'x' }))
    renderWithProviders(<CareerPage />)
    expect(await screen.findByText(/saved interests could not be loaded/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark as interest in Data Analyst/ })).toBeDisabled()
    api.careerInterests.mockResolvedValue({ roleSlugs: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Mark as interest in Data Analyst/ }),
      ).toBeEnabled(),
    )
  })
})

describe('HistoryTable delete', () => {
  it('deletes a row after confirmation', async () => {
    api.analyses.mockResolvedValue(page([row(1), row(2)]))
    api.deleteAnalysis.mockResolvedValue(undefined)
    renderWithProviders(<HistoryTable />)
    const table = await screen.findByRole('table')
    const first = within(table).getAllByRole('row')[1]!
    await userEvent.click(within(first).getByRole('button', { name: /Delete analysis from/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this analysis' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete analysis' }))
    await waitFor(() =>
      expect(api.deleteAnalysis).toHaveBeenCalledWith('00000000-0000-7000-8000-000000000001'),
    )
  })
})
