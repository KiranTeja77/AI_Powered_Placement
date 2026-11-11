const STEPS: { title: string; body: string }[] = [
  {
    title: 'Clean the text',
    body: 'Odd spaces, invisible characters and curly quotes are replaced with plain ones. Nothing is removed, so every position it reports points at your own words.',
  },
  {
    title: 'Find the sections',
    body: 'Headings such as Skills, Projects, Experience and Education split the resume into parts. Where a skill appears matters later.',
  },
  {
    title: 'Pick out the facts',
    body: 'Email, phone, links, degree, CGPA and project titles are found with fixed patterns.',
  },
  {
    title: 'Look for skills',
    body: 'About 450 known skills, each with its usual spellings, are searched for in your text. Names that are also ordinary words (such as React, Go or Excel) only count in a skills list or when clearly used as a tool.',
  },
  {
    title: 'Check close spellings',
    body: 'A word that is very close to a skill but not exact, such as "Kubernets", is shown as possible. You confirm it, and it is never counted until you do.',
  },
  {
    title: 'Grade the evidence',
    body: 'A skill used in a project or internship is applied and counts fully. A skill only named in a list is listed and counts half.',
  },
  {
    title: 'Compare with each role',
    body: 'Every role has core skills (worth 3 points), important skills (2) and bonus skills (1). Readiness is the points you earn divided by the points available.',
  },
  {
    title: 'Suggest next steps',
    body: 'Fixed rules turn the gaps into suggestions, and each one states the reason it was given.',
  },
]

/** A plain-language explanation of the analyzer. Open by default so it is seen on first use. */
export function HowItWorksPanel() {
  return (
    <details open className="max-w-3xl rounded-md border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-3 text-base font-medium text-text">
        How the analysis works
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4">
        <p className="text-base text-text">
          The analyzer follows fixed rules and a list of known skills. It does not guess and it does
          not use a language model.{' '}
          <strong className="font-semibold">
            It never adds a skill that is not written in your text
          </strong>
          : every skill it reports shows the exact words it came from.
        </p>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[1.5rem_1fr] gap-2">
              <span className="font-mono text-sm text-text-muted">{index + 1}.</span>
              <div>
                <p className="text-base font-medium text-text">{step.title}</p>
                <p className="text-base text-text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-text-muted">
          It only knows the skills in its list and cannot tell a claim from a denial, so check the
          result and correct it. Your resume text is stored only for you and is never logged.
        </p>
      </div>
    </details>
  )
}
