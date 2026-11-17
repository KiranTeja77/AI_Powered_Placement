import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SelectField } from '@/components/SelectField'
import { Button } from '@/components/ui/button'
import { notifyUnavailable } from '@/lib/notify'
import { parseCsv } from './csv'
import { Dropzone, MAX_BYTES } from './Dropzone'
import { ReportPanel } from './ReportPanel'
import {
  FIELDS,
  guessMapping,
  isMapped,
  validateRows,
  type ImportField,
  type Mapping,
} from './validate'

const NONE = 'none'

interface Loaded {
  name: string
  headers: string[]
  rows: string[][]
}

export default function ImportPage() {
  const [file, setFile] = useState<Loaded | null>(null)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (picked: File) => {
    setError(null)
    if (!/\.csv$/i.test(picked.name) && picked.type !== 'text/csv') {
      setError('Choose a .csv file.')
      return
    }
    if (picked.size > MAX_BYTES) {
      setError('This file is over 2 MB. Split it and import the parts one by one.')
      return
    }
    const table = parseCsv(await picked.text())
    if (table.length < 2) {
      setError('The file needs a header row and at least one student row.')
      return
    }
    const [headers, ...rows] = table as [string[], ...string[][]]
    setFile({ name: picked.name, headers, rows })
    setMapping(guessMapping(headers))
  }

  const report = useMemo(
    () => (file && mapping && isMapped(mapping) ? validateRows(file.rows, mapping) : null),
    [file, mapping],
  )

  const choose = (key: ImportField, value: string) =>
    setMapping((m) => (m ? { ...m, [key]: value === NONE ? null : Number(value) } : m))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/tp' }, { label: 'Academic import' }]}
        title="Academic import"
        description="Bring marks and backlogs from your college records. The file is checked here before anything is imported."
        action={
          <Button disabled={!report || report.validRows === 0} onClick={notifyUnavailable}>
            Import {report ? `${report.validRows} rows` : ''}
          </Button>
        }
      />
      <div className="max-w-5xl space-y-6">
        {!file ? (
          <Dropzone onFile={(f) => void load(f)} error={error} />
        ) : (
          <>
            <Section
              title="File"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setMapping(null)
                  }}
                >
                  Remove file
                </Button>
              }
            >
              <p className="px-4 py-3 text-base text-text">
                <span className="font-mono text-sm">{file.name}</span>, {file.rows.length} student{' '}
                {file.rows.length === 1 ? 'row' : 'rows'}, {file.headers.length} columns.
              </p>
            </Section>

            <Section
              title="Match columns"
              description="Choose which column holds each value. Obvious matches are filled in."
            >
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <SelectField
                    key={f.key}
                    label={f.label}
                    value={mapping?.[f.key] == null ? NONE : String(mapping[f.key])}
                    onChange={(v) => choose(f.key, v)}
                    options={[
                      { value: NONE, label: 'Not matched' },
                      ...file.headers.map((h, i) => ({
                        value: String(i),
                        label: h || `Column ${i + 1}`,
                      })),
                    ]}
                  />
                ))}
              </div>
            </Section>

            {report ? (
              <ReportPanel report={report} />
            ) : (
              <p role="status" className="text-base text-text-muted">
                Match all four columns to see the validation report.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
