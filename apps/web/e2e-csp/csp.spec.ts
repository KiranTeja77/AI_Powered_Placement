import { expect, test, type Page } from '@playwright/test'
import { registerAs, registerViaApi, signIn } from '../e2e/helpers.ts'

/** Collects every Content-Security-Policy violation the page reports, from the page itself. */
async function watchViolations(page: Page) {
  const found: string[] = []
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      ;(window as unknown as { __csp: string[] }).__csp ??= []
      ;(window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} blocked ${e.blockedURI || 'inline'} (${e.sourceFile}:${e.lineNumber})`,
      )
    })
  })
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) found.push(m.text())
  })
  return async () => [
    ...found,
    ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
  ]
}

test('the production build ships a policy and no inline script', async ({ page }) => {
  const response = await page.goto('/login')
  expect(response?.status()).toBe(200)
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  expect(policy).toContain("script-src 'self'")
  expect(policy).not.toContain("'unsafe-eval'")
  expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/)
  await expect(page.locator('script:not([src])')).toHaveCount(0)
})

test('the theme still applies without an inline script', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'))
  await page.goto('/login')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('student, T&P and admin screens run under the policy, including the editor and charts', async ({
  page,
  request,
}) => {
  const violations = await watchViolations(page)

  // Public pages and a student's screens, including the code editor and its worker.
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  for (const path of ['/s', '/s/resume', '/s/career', '/s/assessments/sample/start']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await page.goto('/s/practice/coding/problem')
  await expect(page.locator('.monaco-editor')).toBeVisible()
  // Typing reaches the editor, so its input and its rendering both work under the policy. Monaco
  // takes focus from a click, and it needs a moment after it appears before it accepts input, so
  // retry the click and the typing until the text shows up.
  await expect(async () => {
    await page.locator('.monaco-editor .view-lines').click()
    await page.keyboard.type('print(42)', { delay: 20 })
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('print', {
      timeout: 2_000,
    })
  }).toPass({ timeout: 25_000 })

  // T&P: the charting library, and a form with a multi-select popover.
  const tp = await registerAs(request, 'TP_HEAD')
  await page.context().clearCookies()
  await page.evaluate(() => sessionStorage.clear())
  await signIn(page, tp.email, tp.home)
  await page.goto('/tp/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible()
  await page.goto('/tp/drives/new')
  await page.getByRole('button', { name: 'Eligible departments' }).click()
  await expect(page.getByRole('option').first()).toBeVisible()

  // Admin: a table, a dialog, a select.
  const admin = await registerAs(request, 'ADMIN')
  await page.context().clearCookies()
  await signIn(page, admin.email, admin.home)
  await page.goto('/admin/users')
  await page.getByRole('button', { name: 'Create user' }).click()
  await expect(page.getByRole('dialog', { name: 'Create a staff account' })).toBeVisible()

  expect(await violations(), 'Content-Security-Policy violations').toEqual([])
})
