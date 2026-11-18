import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderScreen } from '@/features/student/__tests__/testing'
import type { EligibilityReport, ShortlistReport } from '@/lib/api/tp-types'
import { authApi } from '@/lib/api/auth-api'
import { resumeApi } from '@/lib/api/resume-api'
import AnalyticsPage from '../analytics/AnalyticsPage'
import { HeatmapGrid } from '../analytics/HeatmapGrid'
import { overallResult } from '../drives/criteria'
import DriveFormPage from '../drives/DriveFormPage'
import EligibilityPage from '../drives/EligibilityPage'
import { EligibilityView } from '../drives/EligibilityView'
import { driveSchema } from '../drives/schemas'
import ShortlistPage from '../drives/ShortlistPage'
import { ShortlistView } from '../drives/ShortlistView'
import TpDrivesPage from '../drives/TpDrivesPage'
import ImportPage from '../import/ImportPage'
import { parseCsv } from '../import/csv'
import { guessMapping, validateRows } from '../import/validate'
import TpOverviewPage from '../overview/TpOverviewPage'
import PlacementsPage from '../placements/PlacementsPage'

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/api/auth-api', () => ({ authApi: { departments: vi.fn() } }))
vi.mock('@/lib/api/resume-api', () => ({ resumeApi: { skills: vi.fn() } }))

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  toast.mockClear()
  vi.mocked(authApi.departments).mockResolvedValue([
    { id: 'd1', code: 'CSE', name: 'Computer Science' },
  ])
  vi.mocked(resumeApi.skills).mockResolvedValue([
    { slug: 'python', name: 'Python', category: 'Languages' },
  ])
})
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe.each([
  ['overview', <TpOverviewPage />, 'No readiness data yet'],
  ['analytics', <AnalyticsPage />, 'No gap data yet'],
  ['drives', <TpDrivesPage />, 'No drives yet'],
  ['placements', <PlacementsPage />, 'No placements to track yet'],
])('%s', (_name, page, title) => {
  it(`shows "${title}" without calling the network`, () => {
    renderScreen(page)
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('T&P pages without data', () => {
  it('overview stat cards show dashes', () => {
    renderScreen(<TpOverviewPage />)
    for (const label of [
      'Registered students',
      'Average readiness',
      'Open drives',
      'Placed so far',
    ]) {
      expect(screen.getByLabelText(`${label}: no data`)).toHaveTextContent('—')
    }
  })

  it('analytics shows both empty states and an export that says it is unavailable', async () => {
    renderScreen(<AnalyticsPage />)
    expect(screen.getByText('No trend yet')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(toast).toHaveBeenCalledWith("Saving isn't available yet")
  })

  it('eligibility and shortlist say when there is nothing to show', () => {
    const a = renderScreen(<EligibilityPage />, {
      route: '/tp/drives/x/eligibility',
      path: '/tp/drives/:id/eligibility',
    })
    expect(screen.getByText('No eligibility report')).toBeInTheDocument()
    a.unmount()
    renderScreen(<ShortlistPage />, {
      route: '/tp/drives/x/shortlist',
      path: '/tp/drives/:id/shortlist',
    })
    expect(screen.getByText('No shortlist to show')).toBeInTheDocument()
  })
})

const REPORT: EligibilityReport = {
  driveTitle: 'Acme, Engineer',
  criteriaSource: 'Company email, 12 Nov',
  criteria: [
    { id: 'cgpa', label: 'CGPA 7+' },
    { id: 'backlogs', label: 'No backlogs' },
  ],
  students: [
    {
      studentId: '1',
      name: 'Asha',
      rollNo: '21CS1',
      results: { cgpa: 'met', backlogs: 'met' },
      explanation: ['CGPA 8.4 is above 7.'],
    },
    {
      studentId: '2',
      name: 'Ravi',
      rollNo: '21CS2',
      results: { cgpa: 'met', backlogs: 'not_met' },
      explanation: ['1 backlog.'],
    },
    {
      studentId: '3',
      name: 'Meera',
      rollNo: '21CS3',
      results: { cgpa: 'unknown', backlogs: 'met' },
      explanation: ['No CGPA on record.'],
    },
  ],
}

describe('EligibilityView', () => {
  it('overall result: not met beats unknown, unknown beats met', () => {
    expect(overallResult(['met', 'met'])).toBe('met')
    expect(overallResult(['met', 'unknown'])).toBe('unknown')
    expect(overallResult(['unknown', 'not_met'])).toBe('not_met')
  })

  it('shows unknown differently from not met, with the criteria source', () => {
    renderScreen(<EligibilityView report={REPORT} />)
    expect(screen.getByText(/Company email, 12 Nov/)).toBeInTheDocument()
    const table = screen.getByRole('table')
    const rowOf = (name: string) => within(table).getByText(name).closest('tr') as HTMLElement
    expect(within(rowOf('Ravi')).getAllByText('Not met').length).toBeGreaterThan(0)
    const meera = rowOf('Meera')
    expect(within(meera).getAllByText('Unknown').length).toBeGreaterThan(0)
    expect(within(meera).queryByText('Not met')).not.toBeInTheDocument()
    // Not the same shape: unknown has a dashed outline, not met has a solid one.
    expect(within(meera).getAllByText('Unknown')[0]!.className).toContain('border-dashed')
    expect(within(rowOf('Ravi')).getAllByText('Not met')[0]!.className).toContain('border-solid')
    expect(screen.getByText(/It is not the same as not met/)).toBeInTheDocument()
  })

  it('expands the match explanation for one student', async () => {
    renderScreen(<EligibilityView report={REPORT} />)
    const table = screen.getByRole('table')
    expect(screen.queryByText('No CGPA on record.')).not.toBeInTheDocument()
    const why = within(table).getByRole('button', { name: /Why for Meera/ })
    expect(why).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(why)
    expect(why).toHaveAttribute('aria-expanded', 'true')
    expect(within(table).getByText('No CGPA on record.')).toBeInTheDocument()
  })
})

const SHORTLIST: ShortlistReport = {
  driveTitle: 'Acme, Engineer',
  candidates: [
    {
      studentId: '1',
      name: 'Asha',
      rollNo: '21CS1',
      department: 'CSE',
      cgpa: 8.4,
      consent: 'given',
    },
    {
      studentId: '2',
      name: 'Ravi',
      rollNo: '21CS2',
      department: 'CSE',
      cgpa: 7.1,
      consent: 'pending',
    },
    {
      studentId: '3',
      name: 'Meera',
      rollNo: '21CS3',
      department: 'IT',
      cgpa: null,
      consent: 'declined',
    },
  ],
}

describe('ShortlistView', () => {
  it('only lets students who consented be selected, and confirms before approving', async () => {
    renderScreen(<ShortlistView report={SHORTLIST} />)
    const approve = screen.getByRole('button', { name: 'Approve shortlist' })
    expect(approve).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Ravi/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Meera/ })).toBeDisabled()
    expect(screen.getAllByText('Cannot be shortlisted without consent to share.')).toHaveLength(2)

    await userEvent.click(screen.getByRole('checkbox', { name: /Asha/ }))
    expect(screen.getByText('1 of 3 selected')).toBeInTheDocument()
    await userEvent.click(approve)
    const dialog = await screen.findByRole('dialog', { name: 'Approve this shortlist' })
    expect(toast).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve shortlist' }))
    expect(toast).toHaveBeenCalledWith("Saving isn't available yet")
  })

  it('export buttons say they are unavailable', async () => {
    renderScreen(<ShortlistView report={SHORTLIST} />)
    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(toast).toHaveBeenCalledTimes(2)
  })
})

describe('HeatmapGrid', () => {
  it('shows a number and a band for each cell, and a dash where there are no attempts', () => {
    renderScreen(
      <HeatmapGrid
        cells={[
          { department: 'CSE', topic: 'DBMS', percent: 35 },
          { department: 'CSE', topic: 'Aptitude', percent: 85 },
          { department: 'IT', topic: 'DBMS', percent: null },
        ]}
      />,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getAllByText(/Below 40%/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByRole('list', { name: 'Legend' })).toBeInTheDocument()
  })
})

describe('CSV reading and validation', () => {
  it('parses quotes, commas in quotes, CRLF and a byte order mark', () => {
    const text = '﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n3,4\r\n'
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['3', '4'],
    ])
  })

  it('guesses columns from common header names', () => {
    expect(guessMapping(['Name', 'Roll No.', 'GPA', 'Active Backlogs', 'Year of Passing'])).toEqual(
      {
        rollNo: 1,
        cgpa: 2,
        backlogs: 3,
        graduationYear: 4,
      },
    )
    expect(guessMapping(['a', 'b']).rollNo).toBeNull()
  })

  it('reports each kind of problem with its line number', () => {
    const mapping = { rollNo: 0, cgpa: 1, backlogs: 2, graduationYear: 3 }
    const report = validateRows(
      [
        ['21CS001', '8.4', '0', '2027'],
        ['21cs001', '8', '0', '2027'],
        ['??', '7', '0', '2027'],
        ['21CS003', '11', '0', '2027'],
        ['21CS004', '7', '1.5', '2027'],
        ['21CS005', '7', '0', '27'],
      ],
      mapping,
    )
    expect(report.totalRows).toBe(6)
    expect(report.validRows).toBe(1)
    expect(report.invalidFormat).toEqual([{ line: 4, rollNo: '??' }])
    expect(report.issues.map((i) => `${i.line}:${i.field}`)).toEqual([
      '3:Roll number',
      '4:Roll number',
      '5:CGPA',
      '6:Backlogs',
      '7:Graduation year',
    ])
  })
})

describe('ImportPage', () => {
  beforeEach(() => {
    // jsdom's File has no text(); browsers do.
    File.prototype.text = function (this: File) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(this)
      })
    }
  })

  it('refuses a file that is not a CSV', async () => {
    renderScreen(<ImportPage />)
    const input = screen.getByLabelText('CSV file')
    await userEvent.upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }), {
      applyAccept: false,
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a .csv file')
  })

  it('reads a file on the device and reports without any request', async () => {
    renderScreen(<ImportPage />)
    const csv = 'Roll No,CGPA,Backlogs,Graduation Year\n21CS001,8.4,0,2027\n21CS002,x,0,2027\n'
    await userEvent.upload(
      screen.getByLabelText('CSV file'),
      new File([csv], 'marks.csv', { type: 'text/csv' }),
    )
    expect(await screen.findByText('marks.csv')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Valid rows')).toBeInTheDocument())
    expect(screen.getByRole('cell', { name: 'Must be a number from 0 to 10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import 1 rows' })).toBeEnabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('driveSchema', () => {
  const ok = {
    company: 'Acme',
    role: 'Engineer',
    description: 'Build and run backend services.',
    ctc: '8.5',
    location: 'Pune',
    departmentIds: ['d1'],
    graduationYear: '2027',
    minCgpa: '7',
    minPercentage: '',
    maxBacklogs: '0',
    skillSlugs: [],
    stages: [{ id: 's', name: 'Test' }],
    driveDate: '2099-01-01',
    criteriaSource: 'Company email',
  }

  it('accepts a complete drive', () => {
    expect(driveSchema.safeParse(ok).success).toBe(true)
  })

  it.each([
    ['departmentIds', []],
    ['ctc', '0'],
    ['graduationYear', '27'],
    ['minCgpa', '11'],
    ['maxBacklogs', '-1'],
    ['driveDate', '2020-01-01'],
    ['criteriaSource', ''],
    ['stages', []],
  ])('rejects a bad %s', (field, value) => {
    expect(driveSchema.safeParse({ ...ok, [field]: value }).success).toBe(false)
  })

  it('rejects repeated stage names', () => {
    const stages = [
      { id: 'a', name: 'Test' },
      { id: 'b', name: 'test' },
    ]
    expect(driveSchema.safeParse({ ...ok, stages }).success).toBe(false)
  })
})

describe('DriveFormPage', () => {
  it('lists real departments and skills, and checks before saving', async () => {
    renderScreen(<DriveFormPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Save drive' }))
    expect(await screen.findByText('Enter the company name')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Eligible departments' }))
    expect(await screen.findByRole('option', { name: /CSE/ })).toBeInTheDocument()
  })
})
