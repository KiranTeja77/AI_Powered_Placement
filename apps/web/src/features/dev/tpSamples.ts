/**
 * Labelled sample content for laying out the eligibility review and the analytics in the
 * component catalogue. It is imported only by the development catalogue, never by an app route.
 */
import type { EligibilityReport, HeatmapCell, TrendPoint } from '@/lib/api/tp-types'

export const SAMPLE_ELIGIBILITY: EligibilityReport = {
  driveTitle: 'Sample Company, Associate Engineer',
  criteriaSource: 'Company email, 12 Nov (sample)',
  criteria: [
    { id: 'cgpa', label: 'CGPA 7.0+' },
    { id: 'backlogs', label: 'No backlogs' },
    { id: 'dept', label: 'CSE, IT or ECE' },
    { id: 'skills', label: 'SQL and Java' },
  ],
  students: [
    {
      studentId: 's1',
      name: 'Sample Student A',
      rollNo: '21CS101',
      results: { cgpa: 'met', backlogs: 'met', dept: 'met', skills: 'met' },
      explanation: [
        'CGPA 8.4 is above the 7.0 needed.',
        'No active backlogs on record.',
        'CSE is one of the eligible departments.',
        'Resume analysis found SQL (applied) and Java (applied).',
      ],
    },
    {
      studentId: 's2',
      name: 'Sample Student B',
      rollNo: '21CS102',
      results: { cgpa: 'met', backlogs: 'not_met', dept: 'met', skills: 'met' },
      explanation: [
        'CGPA 7.9 is above the 7.0 needed.',
        '1 active backlog on record, none allowed.',
        'CSE is one of the eligible departments.',
        'Resume analysis found SQL (listed) and Java (applied).',
      ],
    },
    {
      studentId: 's3',
      name: 'Sample Student C',
      rollNo: '21IT103',
      results: { cgpa: 'unknown', backlogs: 'unknown', dept: 'met', skills: 'not_met' },
      explanation: [
        'No CGPA on record yet, so this cannot be checked.',
        'No backlog record yet, so this cannot be checked.',
        'IT is one of the eligible departments.',
        'Resume analysis did not find SQL.',
      ],
    },
    {
      studentId: 's4',
      name: 'Sample Student D',
      rollNo: '21EC104',
      results: { cgpa: 'met', backlogs: 'met', dept: 'met', skills: 'unknown' },
      explanation: [
        'CGPA 7.2 is above the 7.0 needed.',
        'No active backlogs on record.',
        'ECE is one of the eligible departments.',
        'No resume analysis yet, so skills cannot be checked.',
      ],
    },
  ],
}

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH']
const TOPICS = ['Aptitude', 'Data structures', 'DBMS', 'Communication']
const VALUES = [
  [72, 58, 81, 66],
  [65, 49, 77, 70],
  [54, 38, null, 62],
  [48, 35, 52, 59],
  [41, null, 44, 55],
] as const

export const SAMPLE_HEATMAP: HeatmapCell[] = DEPARTMENTS.flatMap((department, r) =>
  TOPICS.map((topic, c) => ({ department, topic, percent: VALUES[r]![c] ?? null })),
)

export const SAMPLE_TREND: TrendPoint[] = [
  { semester: 'Sem 3', percent: 48 },
  { semester: 'Sem 4', percent: 53 },
  { semester: 'Sem 5', percent: 58 },
  { semester: 'Sem 6', percent: 64 },
  { semester: 'Sem 7', percent: 67 },
]
