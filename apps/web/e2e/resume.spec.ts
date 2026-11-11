import { expect, test, type Page } from '@playwright/test'
import { chooseRole, registerViaApi, sampleResume, signIn } from './helpers.ts'

/** The row of one skill in the "Skills in your resume" section (matched by its exact name). */
function skillRow(page: Page, name: string) {
  return page
    .getByRole('region', { name: 'Skills in your resume' })
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) })
}

/** The score shown for a role card, e.g. 47.1. */
async function scoreOf(page: Page, role: string): Promise<number> {
  const text = await page
    .getByRole('article', { name: role })
    .getByLabel(/^Readiness/)
    .textContent()
  return parseFloat(text ?? '')
}

test('student analyzes a resume, reads the result and corrects a skill', async ({
  page,
  request,
}) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)

  // The form explains itself before anything is typed.
  await page.goto('/s/resume')
  await expect(page.getByRole('heading', { name: 'Resume analyzer' })).toBeVisible()
  await expect(
    page.getByText('It never adds a skill that is not written in your text'),
  ).toBeVisible()
  await expect(page.getByText('No analyses yet')).toBeVisible()

  // Live validation: too short shows how many characters are missing, and submitting says why not.
  await page.getByLabel('Resume text').fill('Too short to analyze')
  await expect(page.getByText(/more characters needed/)).toBeVisible()
  await page.getByRole('button', { name: 'Analyze resume' }).click()
  await expect(page.getByText('Use at least 200 characters')).toBeVisible()
  await expect(page).toHaveURL(/\/s\/resume$/)

  // A valid resume and a target role.
  await page.getByLabel('Resume text').fill(sampleResume())
  await expect(page.getByText(/of 20,000 characters/)).toContainText('1,329')
  await expect(page.getByText('Ready to analyze')).toBeVisible()
  await chooseRole(page, 'Backend Developer')
  await page.getByRole('button', { name: 'Analyze resume' }).click()

  // The result: readiness with its breakdown, never the number alone.
  await expect(page).toHaveURL(/\/s\/resume\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Readiness by role' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(
    'Resume analyzer',
  )
  const role = page.getByRole('article', { name: 'Backend Developer' })
  await expect(role).toBeVisible()
  await expect(role.getByLabel(/^Readiness/)).toHaveText(/^\d+\.\d%$/)
  await expect(role.getByText(/points available/)).toBeVisible()
  await expect(role.getByRole('table', { name: 'Breakdown for Backend Developer' })).toBeVisible()
  await expect(role.getByRole('cell', { name: /Core/ })).toBeVisible()

  // Skills carry their grade and the words they came from, highlighted.
  const docker = skillRow(page, 'Docker')
  await expect(docker.getByText('Applied')).toBeVisible()
  await expect(docker.locator('mark').first()).toHaveText('Docker')
  await expect(page.getByRole('heading', { name: 'Suggestions' })).toBeVisible()
  await expect(page.getByText(/Reason:/).first()).toBeVisible()

  // Scroll up first so the sticky top bar does not cover the breadcrumb in the capture.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'e2e/screenshots/resume-results-1280-light.png', fullPage: true })

  // Remove a skill, save, and watch the gap update.
  const before = await scoreOf(page, 'Backend Developer')
  await page.getByRole('button', { name: 'Remove Docker' }).click()
  await expect(page.getByText('Removed, not saved')).toBeVisible()
  await expect(page.getByText('You have unsaved changes to the skill list.')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText(/Changes saved\./)).toBeVisible()
  await expect(page.getByText('Recalculated with your changes.')).toBeVisible()
  await expect.poll(() => scoreOf(page, 'Backend Developer')).toBeLessThan(before)
  await expect(page.getByRole('button', { name: 'Reset to analyzer result' })).toBeVisible()

  // The edit is in the history, and survives a reload.
  await page.reload()
  await expect.poll(() => scoreOf(page, 'Backend Developer')).toBeLessThan(before)
  await page.goto('/s/resume')
  const row = page.getByRole('row', { name: /Backend Developer/ })
  await expect(row).toContainText('Edited')
  await row.getByRole('link', { name: 'View' }).click()
  await expect(page.getByRole('heading', { name: 'Readiness by role' })).toBeVisible()

  // Reset returns the analyzer's own score.
  await page.getByRole('button', { name: 'Reset to analyzer result' }).click()
  await expect.poll(() => scoreOf(page, 'Backend Developer')).toBe(before)
})

test('a possible match is confirmed before it counts, and a skill can be added by hand', async ({
  page,
  request,
}) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/resume')
  const text = sampleResume('15_edge_cases')
  await page.getByLabel('Resume text').fill(text)
  await chooseRole(page, 'DevOps Engineer')
  await page.getByRole('button', { name: 'Analyze resume' }).click()
  await expect(page).toHaveURL(/\/s\/resume\/[0-9a-f-]{36}$/)

  // "Kubernets" is close to Kubernetes but not exact: shown as possible, not scored.
  const kubernetes = skillRow(page, 'Kubernetes')
  await expect(kubernetes.getByText(/Possible, \d+% similar/)).toBeVisible()
  await expect(kubernetes.locator('mark').first()).toHaveText('Kubernets')
  const before = await scoreOf(page, 'DevOps Engineer')

  await page.getByRole('button', { name: 'Confirm Kubernetes' }).click()
  await page.getByRole('button', { name: 'Add a skill' }).click()
  await page.getByRole('combobox', { name: 'Search skills' }).fill('Terraform')
  await page.getByRole('option', { name: 'Terraform' }).click()
  await expect(page.getByText('Added, not saved')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText(/Changes saved\./)).toBeVisible()
  await expect.poll(() => scoreOf(page, 'DevOps Engineer')).toBeGreaterThan(before)
  await expect(kubernetes.getByText('Confirmed by you')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Added by you' })).toBeVisible()
})

test('the career page lists the roles with the skills each one needs', async ({
  page,
  request,
}) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/career')
  await expect(page.getByRole('heading', { name: 'Career interests' })).toBeVisible()
  await expect(page.getByText('Backend Developer')).toBeVisible()
  await page.getByText('Backend Developer').click()
  await expect(page.getByRole('heading', { name: /^Core/ }).first()).toBeVisible()
  await expect(page.getByText('REST API').first()).toBeVisible()

  await page.getByLabel('Search roles').fill('vlsi')
  await expect(page.getByText('VLSI Design Engineer')).toBeVisible()
  await expect(page.getByText('Backend Developer')).toHaveCount(0)
  await page.getByLabel('Search roles').fill('zzzz')
  await expect(page.getByText('No roles match your search.')).toBeVisible()
})

test('one student cannot open another student analysis', async ({ page, request, browser }) => {
  const owner = await registerViaApi(request)
  await signIn(page, owner.email)
  await page.goto('/s/resume')
  await page.getByLabel('Resume text').fill(sampleResume())
  await page.getByRole('button', { name: 'Analyze resume' }).click()
  await expect(page).toHaveURL(/\/s\/resume\/[0-9a-f-]{36}$/)
  const url = page.url()

  const other = await registerViaApi(request)
  const context = await browser.newContext()
  const otherPage = await context.newPage()
  await signIn(otherPage, other.email)
  await otherPage.goto(url)
  await expect(otherPage.getByText('Analysis not found')).toBeVisible()
  await context.close()
})
