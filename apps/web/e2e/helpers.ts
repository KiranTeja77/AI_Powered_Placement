import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const PASSWORD = 'E2eSecret42'

/** A realistic resume: the analyzer's own test fixture, so e2e and unit tests share one source. */
export function sampleResume(name = '01_cse_fullstack'): string {
  const path = fileURLToPath(
    new URL(`../../ai-service/tests/fixtures/resumes/${name}.txt`, import.meta.url),
  )
  return readFileSync(path, 'utf-8')
}

/** Unique per run so repeated runs against the same database do not collide. */
export function newStudent() {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  return {
    email: `e2e.${id}@college.edu`,
    rollNo: `E2E${id}`.toUpperCase().slice(0, 20),
    name: 'E2E Student',
  }
}

/** Registers a student through the API, which is faster and less brittle than the form. */
export async function registerViaApi(request: APIRequestContext, student = newStudent()) {
  const departments = await (await request.get('/api/v1/departments')).json()
  const response = await request.post('/api/v1/auth/register', {
    data: {
      fullName: student.name,
      email: student.email,
      rollNo: student.rollNo,
      departmentId: departments[0].id,
      graduationYear: 2027,
      password: PASSWORD,
    },
  })
  expect(response.status()).toBe(201)
  return student
}

export async function signIn(page: Page, identifier: string, home = /\/s$/) {
  await page.goto('/login')
  await page.getByLabel('Email or roll number').fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(home)
}

/** Picks one target role in the multi-select. */
export async function chooseRole(page: Page, name: string) {
  await page.getByRole('button', { name: 'Target roles' }).click()
  await page.getByRole('option', { name: new RegExp(name) }).click()
  await page.keyboard.press('Escape')
}

const HOMES = { FACULTY: /\/f$/, TP_HEAD: /\/tp$/ } as const

/**
 * Registers a student, then changes the role of that one account in the local test database.
 * Faculty and T&P accounts are normally created by an admin, and there is no admin screen for it
 * yet. Only an account this test just created is touched, found by its unique email.
 */
export async function registerAs(request: APIRequestContext, role: keyof typeof HOMES) {
  const student = await registerViaApi(request)
  if (!/^[a-z0-9.]+@college\.edu$/.test(student.email)) throw new Error('unexpected test email')
  const env = Object.fromEntries(
    readFileSync(fileURLToPath(new URL('../../../.env', import.meta.url)), 'utf-8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  )
  execFileSync('docker', [
    'exec',
    'placewise-postgres-1',
    'psql',
    '-U',
    env.POSTGRES_USER!,
    '-d',
    env.POSTGRES_DB!,
    '-c',
    `update app_user set role = '${role}' where email = '${student.email}'`,
  ])
  return { ...student, home: HOMES[role] }
}
