import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { registerAs, registerViaApi, signIn } from './helpers.ts'
import { PUBLIC_ROUTES, ROUTES, SHARED_ROUTES, type SignedInRole } from './routes.ts'

/**
 * Runs axe-core on every route, in both themes, at a phone and a desktop width. Serious and
 * critical findings fail the test; the message names the rule, the page and the elements.
 * The code editor is third-party and is left out.
 */
const VIEWPORTS = [
  { name: '375', width: 375, height: 800 },
  { name: '1280', width: 1280, height: 900 },
] as const
const THEMES = ['light', 'dark'] as const

async function seriousFindings(page: Page, path: string): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.monaco-editor')
    .analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${path}: [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} element${v.nodes.length === 1 ? '' : 's'}) ` +
        v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | '),
    )
}

async function visit(page: Page, path: string, name: string) {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 }), path).toBeVisible()
  if (name === 'coding')
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 60_000 })
  await page.waitForLoadState('networkidle')
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`accessibility at ${viewport.name}px, ${theme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test('public pages', async ({ page }) => {
        test.setTimeout(180_000)
        const findings: string[] = []
        for (const route of PUBLIC_ROUTES) {
          await visit(page, route.path, route.name)
          findings.push(...(await seriousFindings(page, route.path)))
        }
        expect(findings, findings.join('\n')).toEqual([])
      })

      for (const role of Object.keys(ROUTES) as SignedInRole[]) {
        test(`${role} screens`, async ({ page, request }) => {
          test.setTimeout(300_000)
          const user =
            role === 'STUDENT'
              ? { ...(await registerViaApi(request)), home: /\/s$/ }
              : await registerAs(request, role)
          await signIn(page, user.email, user.home)
          const findings: string[] = []
          for (const route of [...ROUTES[role].routes, ...SHARED_ROUTES]) {
            await visit(page, route.path, route.name)
            findings.push(...(await seriousFindings(page, route.path)))
          }
          expect(findings, findings.join('\n')).toEqual([])
        })
      }
    })
  }
}

// The catalogue shows the sample layouts (test player, result, eligibility and so on) that no
// real screen can show without data, so it is checked as well. Development only.
for (const theme of THEMES) {
  test(`accessibility of the component catalogue, ${theme}`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/dev/components')
    await expect(page.getByRole('heading', { name: 'Component catalogue' })).toBeVisible()
    await page.waitForLoadState('networkidle')
    const findings = await seriousFindings(page, '/dev/components')
    expect(findings, findings.join('\n')).toEqual([])
  })
}
