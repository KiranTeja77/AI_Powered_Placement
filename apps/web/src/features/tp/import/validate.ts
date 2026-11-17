export type ImportField = 'rollNo' | 'cgpa' | 'backlogs' | 'graduationYear'

export const FIELDS: { key: ImportField; label: string; aliases: string[] }[] = [
  {
    key: 'rollNo',
    label: 'Roll number',
    aliases: ['rollno', 'roll', 'rollnumber', 'regno', 'registrationnumber'],
  },
  { key: 'cgpa', label: 'CGPA', aliases: ['cgpa', 'gpa', 'cumulativegpa'] },
  { key: 'backlogs', label: 'Backlogs', aliases: ['backlogs', 'activebacklogs', 'arrears'] },
  {
    key: 'graduationYear',
    label: 'Graduation year',
    aliases: ['graduationyear', 'gradyear', 'passoutyear', 'yearofpassing', 'batch'],
  },
]

/** Header text to a comparable key: "Roll No." and "roll_no" both become "rollno". */
const normalise = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Column index per field, or null where no header looks right. */
export type Mapping = Record<ImportField, number | null>

export function guessMapping(headers: string[]): Mapping {
  const find = (aliases: string[]) => {
    const i = headers.findIndex((h) => aliases.includes(normalise(h)))
    return i === -1 ? null : i
  }
  return {
    rollNo: find(FIELDS[0]!.aliases),
    cgpa: find(FIELDS[1]!.aliases),
    backlogs: find(FIELDS[2]!.aliases),
    graduationYear: find(FIELDS[3]!.aliases),
  }
}

export const isMapped = (m: Mapping) => Object.values(m).every((v) => v !== null)

export interface RowIssue {
  /** The line in the file, counting the header as line 1. */
  line: number
  rollNo: string
  field: string
  message: string
}

export interface ValidationReport {
  totalRows: number
  validRows: number
  issues: RowIssue[]
  /** Roll numbers that do not look like a roll number at all. */
  unknownRolls: { line: number; rollNo: string }[]
}

const ROLL = /^[A-Za-z0-9][A-Za-z0-9/_-]{2,31}$/
const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))

/**
 * Checks every row against the mapping. This only looks at the file itself: whether a roll
 * number belongs to a registered student is checked when the import runs.
 */
export function validateRows(rows: string[][], mapping: Mapping): ValidationReport {
  const cell = (row: string[], key: ImportField) => (row[mapping[key]!] ?? '').trim()
  const issues: RowIssue[] = []
  const unknownRolls: ValidationReport['unknownRolls'] = []
  const firstSeen = new Map<string, number>()
  let validRows = 0

  rows.forEach((row, index) => {
    const line = index + 2
    const rollNo = cell(row, 'rollNo')
    const before = issues.length
    const add = (field: string, message: string) => issues.push({ line, rollNo, field, message })

    if (!ROLL.test(rollNo)) {
      unknownRolls.push({ line, rollNo })
      add('Roll number', rollNo === '' ? 'Roll number is empty' : 'Not a valid roll number')
    } else {
      const seen = firstSeen.get(rollNo.toLowerCase())
      if (seen !== undefined) add('Roll number', `Repeated, first seen on line ${seen}`)
      else firstSeen.set(rollNo.toLowerCase(), line)
    }

    const cgpa = cell(row, 'cgpa')
    if (!isNumber(cgpa) || Number(cgpa) < 0 || Number(cgpa) > 10)
      add('CGPA', 'Must be a number from 0 to 10')
    const backlogs = cell(row, 'backlogs')
    if (!/^\d+$/.test(backlogs) || Number(backlogs) > 50)
      add('Backlogs', 'Must be a whole number from 0 to 50')
    const year = cell(row, 'graduationYear')
    if (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100)
      add('Graduation year', 'Must be a four-digit year from 2000 to 2100')

    if (issues.length === before) validRows++
  })

  return { totalRows: rows.length, validRows, issues, unknownRolls }
}
