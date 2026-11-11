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

export async function signIn(page: Page, identifier: string) {
  await page.goto('/login')
  await page.getByLabel('Email or roll number').fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/s$/)
}

/** Picks one target role in the multi-select. */
export async function chooseRole(page: Page, name: string) {
  await page.getByRole('button', { name: 'Target roles' }).click()
  await page.getByRole('option', { name: new RegExp(name) }).click()
  await page.keyboard.press('Escape')
}
