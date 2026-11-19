import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  chooseRole,
  registerAs,
  registerViaApi,
  sampleResume,
  signIn,
  signInAsAdmin,
} from './helpers.ts'

/**
 * Writes the README screenshots to docs/screenshots. Only runs when DOCS_SCREENSHOTS=1, so the
 * normal suite does not rewrite committed images.
 */
test.skip(!process.env.DOCS_SCREENSHOTS, 'set DOCS_SCREENSHOTS=1 to refresh docs/screenshots')
test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots')
const shot = (name: string) => path.join(OUT, `${name}.png`)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
})

test('resume results', async ({ page, request }) => {
  test.setTimeout(120_000)
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/resume')
  await page.getByLabel('Resume text').fill(sampleResume())
  await chooseRole(page, 'Backend Developer')
  await page.getByRole('button', { name: 'Analyze resume' }).click()
  await expect(page.getByRole('heading', { name: 'Readiness by role' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: shot('resume-results') })
})

test('assessment start and test player', async ({ page, request }) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/assessments/sample/start')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.screenshot({ path: shot('assessment-start') })

  await page.goto('/dev/components')
  const player = page.locator('section[aria-labelledby="dev-test-player"]')
  await expect(player).toBeVisible()
  await player.scrollIntoViewIfNeeded()
  await player.screenshot({ path: shot('test-player') })
})

test('eligibility sample', async ({ page }) => {
  await page.goto('/dev/components')
  const section = page.locator('section[aria-labelledby="dev-eligibility"]')
  await expect(section).toBeVisible()
  await section.screenshot({ path: shot('eligibility') })
})

test('assessment builder', async ({ page, request }) => {
  const faculty = await registerAs(request, 'FACULTY')
  await signIn(page, faculty.email, faculty.home)
  await page.goto('/f/assessments/new')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: shot('assessment-builder') })
})

test('admin users', async ({ page }) => {
  await signInAsAdmin(page)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: shot('admin-users') })
})
