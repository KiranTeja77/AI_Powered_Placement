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

const HOMES = {
  FACULTY: /\/f$/,
  TP_HEAD: /\/tp$/,
  RECRUITER: /\/r$/,
  ADMIN: /\/admin$/,
} as const
export type StaffRole = keyof typeof HOMES

const MAILPIT = 'http://localhost:8025'

/** The seeded administrator's credentials, from the same .env the stack runs with. */
function adminCredentials() {
  const text = readFileSync(fileURLToPath(new URL('../../../.env', import.meta.url)), 'utf-8')
  const value = (key: string) => new RegExp(`^${key}=(.*)$`, 'm').exec(text)?.[1]?.trim() ?? ''
  return { email: value('ADMIN_EMAIL'), password: value('ADMIN_PASSWORD') }
}

/** Signs in as the seeded administrator through the API and returns an access token. */
export async function adminToken(request: APIRequestContext): Promise<string> {
  const { email, password } = adminCredentials()
  const response = await request.post('/api/v1/auth/login', {
    data: { identifier: email, password },
  })
  expect(response.status(), 'the seeded admin must be able to sign in').toBe(200)
  return (await response.json()).accessToken as string
}

/** Waits for the set-password email to arrive in Mailpit and returns the token in its link. */
export async function setPasswordToken(request: APIRequestContext, email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const found = await request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    const messages = ((await found.json()).messages ?? []) as { ID: string }[]
    if (messages.length > 0) {
      const message = await (
        await request.get(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`)
      ).json()
      const token = /set-password\?token=([A-Za-z0-9_-]+)/.exec(message.Text as string)?.[1]
      if (token) return token
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No set-password email reached Mailpit for ${email}`)
}

/**
 * Creates a staff account the way an administrator does: through the admin API, signed in as the
 * seeded admin. The account gets no password from us. The set-password email lands in Mailpit, and
 * the token from its link is used to choose one, exactly as the person would.
 */
export async function registerAs(request: APIRequestContext, role: StaffRole) {
  const token = await adminToken(request)
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  const email = `e2e.${role.toLowerCase()}.${id}@college.edu`
  const departmentId =
    role === 'FACULTY' ? (await (await request.get('/api/v1/departments')).json())[0].id : undefined
  const created = await request.post('/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
    data: { fullName: `E2E ${role}`, email, role, departmentId },
  })
  expect(created.status(), await created.text()).toBe(201)
  const reset = await request.post('/api/v1/auth/reset-password', {
    data: { token: await setPasswordToken(request, email), newPassword: PASSWORD },
  })
  expect(reset.status()).toBe(204)
  return { email, name: `E2E ${role}`, home: HOMES[role] }
}
