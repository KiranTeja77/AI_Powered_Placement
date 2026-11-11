import { expect, test, type Page } from '@playwright/test'
import { chooseRole, registerViaApi, sampleResume, signIn } from './helpers.ts'

/**
 * Screenshots /dev/components at 375 and 1280 px in light and dark, and checks the rendered DOM
 * against the "Banned" list in CLAUDE.md. Screenshots go to e2e/screenshots (not committed).
 */
const VIEWPORTS = [
  { name: '375', width: 375, height: 800 },
  { name: '1280', width: 1280, height: 900 },
] as const
const THEMES = ['light', 'dark'] as const

interface Violation {
  rule: string
  where: string
  value: string
}

export async function audit(page: Page): Promise<Violation[]> {
  return page.evaluate(() => {
    const found: { rule: string; where: string; value: string }[] = []
    const describe = (el: Element) => {
      const text = (el.textContent ?? '').trim().slice(0, 30)
      return `<${el.tagName.toLowerCase()} class="${String(el.getAttribute('class') ?? '').slice(0, 60)}"> ${text}`
    }
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      // Toasts are popovers: they carry the popover shadow and sonner's own enter animation.
      if (el.closest('[data-sonner-toaster]')) continue
      if (cs.backgroundImage.includes('gradient')) {
        found.push({ rule: 'no gradients', where: describe(el), value: cs.backgroundImage })
      }
      // Dialogs and popovers may carry exactly the popover shadow from the design system.
      const popoverShadow =
        el.matches('[role="dialog"], [role="listbox"], [role="menu"]') &&
        cs.boxShadow.endsWith(' 0px 4px 16px 0px')
      if (cs.boxShadow !== 'none' && !popoverShadow) {
        found.push({ rule: 'shadow only on popovers', where: describe(el), value: cs.boxShadow })
      }
      if (cs.backdropFilter !== 'none' && cs.backdropFilter !== '') {
        found.push({ rule: 'no glassmorphism', where: describe(el), value: cs.backdropFilter })
      }
      if (cs.filter !== 'none' && cs.filter.includes('blur')) {
        found.push({ rule: 'no blur', where: describe(el), value: cs.filter })
      }
      // Auth page titles may be 28px; nothing else may exceed 24px.
      const allowedAuthTitle = el.classList.contains('text-auth') && cs.fontSize === '28px'
      if (parseFloat(cs.fontSize) > 24 && !allowedAuthTitle) {
        found.push({ rule: 'type size max 24px', where: describe(el), value: cs.fontSize })
      }
      for (const corner of [
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomLeftRadius,
        cs.borderBottomRightRadius,
      ]) {
        const radius = parseFloat(corner)
        const isPill = corner.includes('%') || radius >= 999
        if (radius > 6 && !isPill) {
          found.push({ rule: 'radius max 6px', where: describe(el), value: corner })
          break
        }
      }
      const durations = cs.transitionDuration
        .split(',')
        .map((d) => parseFloat(d) * (d.includes('ms') ? 0.001 : 1))
      if (durations.some((d) => d > 0.2)) {
        found.push({
          rule: 'transitions at most 200ms',
          where: describe(el),
          value: cs.transitionDuration,
        })
      }
      if (cs.animationName !== 'none' && cs.animationDuration !== '0s') {
        found.push({ rule: 'no animation', where: describe(el), value: cs.animationName })
      }
    }
    const doc = document.documentElement
    if (doc.scrollWidth > doc.clientWidth + 1) {
      found.push({
        rule: 'no horizontal page scroll',
        where: 'document',
        value: `${doc.scrollWidth} > ${doc.clientWidth}`,
      })
    }
    return found
  })
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`/dev/components at ${viewport.name}px, ${theme}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/dev/components')
      await expect(page.getByRole('heading', { name: 'Component catalogue' })).toBeVisible()
      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^((?!dark).)*$/)

      await page.screenshot({
        path: `e2e/screenshots/components-${viewport.name}-${theme}.png`,
        fullPage: true,
      })

      const violations = await audit(page)
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
    })
  }
}

/** The real screens: sign-in, the app shell (with the mobile sheet) and account settings. */
test.describe('app screens', () => {
  const PASSWORD = 'AuditSecret42'
  const id = `${Date.now().toString(36)}`
  const email = `audit.${id}@college.edu`

  test.beforeAll(async ({ request }) => {
    const departments = await (await request.get('/api/v1/departments')).json()
    const response = await request.post('/api/v1/auth/register', {
      data: {
        fullName: 'Audit Student',
        email,
        rollNo: `AUD${id}`.toUpperCase().slice(0, 20),
        departmentId: departments[0].id,
        graduationYear: 2027,
        password: PASSWORD,
      },
    })
    expect(response.status()).toBe(201)
  })

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`screens at ${viewport.name}px, ${theme}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const shot = (name: string) =>
          page.screenshot({
            path: `e2e/screenshots/${name}-${viewport.name}-${theme}.png`,
            fullPage: true,
          })

        await page.goto('/login')
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
        await shot('login')
        expect(await audit(page), 'login').toEqual([])

        await page.goto('/register')
        await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
        await shot('register')
        expect(await audit(page), 'register').toEqual([])

        await page.goto('/login')
        await page.getByLabel('Email or roll number').fill(email)
        await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
        await page.getByRole('button', { name: 'Sign in' }).click()
        await expect(page).toHaveURL(/\/s$/)
        await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
        await shot('shell')
        expect(await audit(page), 'shell').toEqual([])

        if (viewport.width < 768) {
          await page.getByRole('button', { name: 'Open navigation' }).click()
          await expect(page.getByRole('dialog')).toBeVisible()
          await shot('shell-nav-sheet')
          await page.keyboard.press('Escape')
        } else {
          await page.getByRole('button', { name: 'Collapse sidebar' }).click()
          await shot('shell-collapsed')
          await page.getByRole('button', { name: 'Expand sidebar' }).click()
        }

        await page.goto('/settings/account')
        await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
        await shot('account')
        expect(await audit(page), 'account').toEqual([])
      })
    }
  }
})

/** The resume analyzer screens: form, results, career catalogue and the analyzer-down message. */
test.describe('resume screens', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`resume screens at ${viewport.name}px, ${theme}`, async ({ page, request }) => {
        const student = await registerViaApi(request)
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        const shot = (name: string) =>
          page.screenshot({
            path: `e2e/screenshots/${name}-${viewport.name}-${theme}.png`,
            fullPage: true,
          })
        await signIn(page, student.email)

        // The form, with the empty history and the explanation.
        await page.goto('/s/resume')
        await expect(page.getByRole('heading', { name: 'Resume analyzer' })).toBeVisible()
        await expect(page.getByText('No analyses yet')).toBeVisible()
        await shot('resume-form')
        expect(await audit(page), 'resume form').toEqual([])

        // The analyzer being down: a friendly message, and the text is kept.
        await page.route('**/api/v1/resumes/analyze', (route) =>
          route.fulfill({
            status: 503,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              status: 503,
              code: 'analysis_unavailable',
              detail: 'Resume analysis is temporarily unavailable.',
            }),
          }),
        )
        await page.getByLabel('Resume text').fill(sampleResume())
        await page.getByRole('button', { name: 'Analyze resume' }).click()
        await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
        await shot('resume-unavailable')
        expect(await audit(page), 'analyzer down').toEqual([])
        await page.unroute('**/api/v1/resumes/analyze')

        // A real result.
        await chooseRole(page, 'Backend Developer')
        await page.getByRole('button', { name: 'Analyze resume' }).click()
        await expect(page.getByRole('heading', { name: 'Readiness by role' })).toBeVisible()
        await shot('resume-results')
        expect(await audit(page), 'results').toEqual([])

        // Edit bar with an unsaved change.
        await page.getByRole('button', { name: 'Remove Docker' }).click()
        await expect(page.getByText('You have unsaved changes to the skill list.')).toBeVisible()
        await shot('resume-results-editing')
        expect(await audit(page), 'results while editing').toEqual([])

        // History with one row, and the career catalogue.
        await page.goto('/s/resume')
        await expect(page.getByRole('link', { name: /^View/ }).first()).toBeVisible()
        await shot('resume-history')
        expect(await audit(page), 'history').toEqual([])

        await page.goto('/s/career')
        await expect(page.getByRole('heading', { name: 'Career interests' })).toBeVisible()
        await page.getByText('Backend Developer', { exact: true }).click()
        await page.getByRole('button', { name: /Mark as interest in Backend Developer/ }).click()
        await expect(page.getByText('Interested', { exact: true })).toBeVisible()
        await shot('career')
        expect(await audit(page), 'career').toEqual([])

        // The delete confirmation, opened from the history.
        await page.goto('/s/resume')
        await page.getByRole('button', { name: /Delete analysis from/ }).click()
        await expect(page.getByRole('dialog', { name: 'Delete this analysis' })).toBeVisible()
        await shot('resume-delete-dialog')
        expect(await audit(page), 'delete dialog').toEqual([])
      })
    }
  }
})
