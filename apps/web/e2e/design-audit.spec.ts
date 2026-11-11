import { expect, test, type Page } from '@playwright/test'

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
      if (cs.backgroundImage.includes('gradient')) {
        found.push({ rule: 'no gradients', where: describe(el), value: cs.backgroundImage })
      }
      if (cs.boxShadow !== 'none') {
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
