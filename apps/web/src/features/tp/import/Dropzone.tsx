import { FileUp } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const MAX_BYTES = 2 * 1024 * 1024

interface DropzoneProps {
  onFile: (file: File) => void
  error: string | null
}

/** Drag a CSV in, or choose one. The file is read in the browser; nothing is uploaded. */
export function Dropzone({ onFile, error }: DropzoneProps) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn(
          'flex flex-col items-start gap-2 rounded-md border border-dashed px-4 py-8 sm:items-center sm:text-center',
          over ? 'border-primary bg-primary-subtle' : 'border-border bg-surface',
        )}
      >
        <FileUp className="size-5 text-text-muted" aria-hidden="true" />
        <p className="text-base font-medium text-text">Drop a CSV file here</p>
        <p className="max-w-md text-base text-text-muted">
          One row per student with roll number, CGPA, backlogs and graduation year. Up to 2 MB. The
          file is read on this device and nothing is uploaded.
        </p>
        <Button variant="secondary" onClick={() => input.current?.click()}>
          Choose a file
        </Button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-base text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
