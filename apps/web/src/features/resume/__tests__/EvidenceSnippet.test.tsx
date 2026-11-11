import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Evidence } from '@/lib/api/resume-types'
import { EvidenceSnippet } from '../EvidenceSnippet'

const LINE = 'Containerised the app using Docker and deployed it.'

/** Evidence for the words `word` in LINE, positioned as the API reports it (snippetStart = 100). */
const at = (word: string): Partial<Evidence> => {
  const offset = LINE.indexOf(word)
  return { start: 100 + offset, end: 100 + offset + word.length, matchedText: word }
}

const evidence = (overrides: Partial<Evidence> = {}): Evidence => ({
  start: 120,
  end: 126,
  matchedText: 'Docker',
  section: 'projects',
  snippet: 'Containerised the app using Docker and deployed it.',
  snippetStart: 100,
  ...overrides,
})

describe('EvidenceSnippet', () => {
  it('highlights exactly the matched words, by position', () => {
    render(<EvidenceSnippet evidence={evidence(at('Docker'))} />)
    const mark = screen.getByText('Docker', { selector: 'mark' })
    expect(mark).toBeInTheDocument()
    expect(mark.parentElement).toHaveTextContent(
      'Containerised the app using Docker and deployed it.',
    )
  })

  it('says where in the resume the line came from', () => {
    render(<EvidenceSnippet evidence={evidence({ section: 'experience', start: 127, end: 133 })} />)
    expect(screen.getByText('Experience or internship')).toBeInTheDocument()
  })

  it('highlights the first word when the match is at the start of the snippet', () => {
    render(<EvidenceSnippet evidence={evidence(at('Containerised'))} />)
    expect(
      screen.getByText('Containerised', { selector: 'mark', exact: false }),
    ).toBeInTheDocument()
  })

  it('shows the plain line, never a wrong highlight, when the positions do not fit', () => {
    const { container } = render(<EvidenceSnippet evidence={evidence({ start: 10, end: 20 })} />)
    expect(container.querySelector('mark')).toBeNull()
    expect(screen.getByText(/Containerised the app/)).toBeInTheDocument()
  })
})
