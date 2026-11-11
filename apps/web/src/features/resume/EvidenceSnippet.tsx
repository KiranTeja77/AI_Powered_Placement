import type { Evidence } from '@/lib/api/resume-types'
import { sectionLabel } from './labels'

/**
 * The line of the resume a skill came from, with the matched words highlighted. The highlight is
 * placed by position, not by searching the text, so it marks the exact words the analyzer found.
 */
export function EvidenceSnippet({ evidence }: { evidence: Evidence }) {
  const start = evidence.start - evidence.snippetStart
  const end = evidence.end - evidence.snippetStart
  const valid = start >= 0 && end > start && end <= evidence.snippet.length

  return (
    <p className="text-sm text-text-muted">
      <span className="mr-2 text-xs">{sectionLabel(evidence.section)}</span>
      <q className="[quotes:none]">
        {valid ? (
          <>
            {evidence.snippet.slice(0, start)}
            <mark className="rounded-sm bg-primary-subtle px-0.5 font-medium text-text">
              {evidence.snippet.slice(start, end)}
            </mark>
            {evidence.snippet.slice(end)}
          </>
        ) : (
          evidence.snippet
        )}
      </q>
    </p>
  )
}
