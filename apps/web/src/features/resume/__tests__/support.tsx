import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { AnalysisDetail, RoleDefinition } from '@/lib/api/resume-types'

/** Renders a component with a fresh query client and a router, as the app does. */
export function renderWithProviders(ui: ReactElement, { route = '/', path = '*' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="/s/resume/:id" element={<p>analysis page</p>} />
          <Route path="/s/resume" element={<p>/s/resume reached</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export const ROLES: RoleDefinition[] = [
  {
    slug: 'backend-developer',
    name: 'Backend Developer',
    summary: 'Builds servers, APIs and databases behind applications.',
    branches: ['CSE', 'IT'],
    skills: [
      { slug: 'rest-api', name: 'REST API', category: 'Web development', importance: 'core' },
      { slug: 'docker', name: 'Docker', category: 'Cloud and DevOps', importance: 'important' },
      { slug: 'kafka', name: 'Apache Kafka', category: 'Data and analytics', importance: 'bonus' },
    ],
  },
  {
    slug: 'data-analyst',
    name: 'Data Analyst',
    summary: 'Turns data into reports and decisions.',
    branches: ['CSE', 'ECE'],
    skills: [{ slug: 'sql', name: 'SQL', category: 'Programming languages', importance: 'core' }],
  },
]

const SNIPPET = 'Containerised the app using Docker and deployed on AWS.'

/** A small, typed analysis used only by tests. It is never shipped in the app. */
export function makeDetail(overrides: Partial<AnalysisDetail> = {}): AnalysisDetail {
  const dockerStart = SNIPPET.indexOf('Docker')
  const detail: AnalysisDetail = {
    id: '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    createdAt: '2026-11-11T05:30:00Z',
    updatedAt: '2026-11-11T05:30:00Z',
    targetRoles: [{ slug: 'backend-developer', name: 'Backend Developer' }],
    edits: null,
    result: {
      engineVersion: '1.0.0',
      taxonomyVersion: '1.0.0',
      textLength: 640,
      sections: [{ name: 'projects', heading: 'PROJECTS', start: 0, end: 640 }],
      fields: {
        emails: [{ start: 0, end: 12, text: 'kiran@x.test' }],
        phones: [],
        links: [],
        education: [{ degree: 'B.Tech', start: 0, end: 6, line: 'B.Tech' }],
        cgpa: { kind: 'cgpa', value: 8.5, scale: 10, start: 0, end: 3, text: 'CGPA' },
        projectTitles: [{ start: 0, end: 10, text: 'Portal App' }],
      },
      skills: [
        {
          id: 'docker',
          name: 'Docker',
          category: 'Cloud and DevOps',
          status: 'detected',
          grade: 'applied',
          strength: 1,
          countsTowardScore: true,
          mentionCount: 2,
          similarity: null,
          evidence: [
            {
              start: 100 + dockerStart,
              end: 100 + dockerStart + 6,
              matchedText: 'Docker',
              section: 'projects',
              snippet: SNIPPET,
              snippetStart: 100,
            },
            {
              start: 400,
              end: 406,
              matchedText: 'Docker',
              section: 'skills',
              snippet: 'Tools: Git, Docker',
              snippetStart: 394,
            },
          ],
        },
        {
          id: 'python',
          name: 'Python',
          category: 'Programming languages',
          status: 'detected',
          grade: 'listed',
          strength: 0.5,
          countsTowardScore: true,
          mentionCount: 1,
          similarity: null,
          evidence: [
            {
              start: 40,
              end: 46,
              matchedText: 'Python',
              section: 'skills',
              snippet: 'Languages: Java, Python',
              snippetStart: 30,
            },
          ],
        },
        {
          id: 'kubernetes',
          name: 'Kubernetes',
          category: 'Cloud and DevOps',
          status: 'possible',
          grade: 'listed',
          strength: 0.5,
          countsTowardScore: false,
          mentionCount: 1,
          similarity: 94.7,
          evidence: [
            {
              start: 60,
              end: 69,
              matchedText: 'Kubernets',
              section: 'skills',
              snippet: 'Python, Kubernets',
              snippetStart: 52,
            },
          ],
        },
      ],
      roles: [],
      suggestions: [
        {
          id: 'missing-core-rest-api',
          kind: 'skill_gap',
          priority: 'high',
          message: 'Learn REST API and show it in a project.',
          reason:
            'REST API is a core skill for Backend Developer and was not found in your resume.',
          skills: ['rest-api'],
        },
        {
          id: 'add-numbers',
          kind: 'impact',
          priority: 'low',
          message: 'Add measurable results.',
          reason: 'No numbers or percentages were found in your projects or experience.',
          skills: [],
        },
      ],
    },
    effective: {
      suggestions: [],
      skills: [
        {
          id: 'docker',
          name: 'Docker',
          category: 'Cloud and DevOps',
          strength: 1,
          grade: 'applied',
          source: 'detected',
        },
        {
          id: 'python',
          name: 'Python',
          category: 'Programming languages',
          strength: 0.5,
          grade: 'listed',
          source: 'detected',
        },
      ],
      roles: [
        {
          roleId: 'backend-developer',
          name: 'Backend Developer',
          score: 30.8,
          earned: 8,
          maximum: 26,
          byImportance: [
            {
              importance: 'core',
              weight: 3,
              matched: 0,
              partial: 0,
              possible: 0,
              missing: 1,
              earned: 0,
              maximum: 3,
            },
            {
              importance: 'important',
              weight: 2,
              matched: 1,
              partial: 0,
              possible: 1,
              missing: 0,
              earned: 2,
              maximum: 4,
            },
            {
              importance: 'bonus',
              weight: 1,
              matched: 0,
              partial: 1,
              possible: 0,
              missing: 0,
              earned: 0.5,
              maximum: 1,
            },
          ],
          items: [
            {
              skillId: 'rest-api',
              name: 'REST API',
              importance: 'core',
              weight: 3,
              status: 'missing',
              strength: 0,
              points: 0,
            },
            {
              skillId: 'docker',
              name: 'Docker',
              importance: 'important',
              weight: 2,
              status: 'matched',
              strength: 1,
              points: 2,
            },
            {
              skillId: 'kubernetes',
              name: 'Kubernetes',
              importance: 'important',
              weight: 2,
              status: 'possible',
              strength: 0,
              points: 0,
            },
          ],
        },
      ],
    },
  }
  // Until a student edits, the suggestions are the analyzer's own.
  detail.effective.suggestions = detail.result.suggestions
  return { ...detail, ...overrides }
}
