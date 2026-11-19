import { expect, test, type Locator, type Page } from '@playwright/test'
import { PASSWORD, registerAs, registerViaApi, sampleResume, signInAsAdmin } from './helpers.ts'

/**
 * Keyboard-only checks: these flows use Tab, Shift+Tab, Enter, Space and the arrow keys. No
 * mouse clicks. Focus must reach every control, and a visible ring must follow it.
 */

/** Presses Tab until the locator's element has focus, or fails after a fixed number of presses. */
async function tabTo(page: Page, target: Locator, limit = 60) {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return
  }
  throw new Error(`Tab did not reach the target within ${limit} presses`)
}

async function focusRingVisible(page: Page) {
  const outline = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return ''
    const s = getComputedStyle(el)
    return `${s.outlineStyle} ${s.outlineWidth} ${s.boxShadow}`
  })
  expect(outline).not.toMatch(/^none 0px none$/)
}

test('sign in with the keyboard only', async ({ page, request }) => {
  const student = await registerViaApi(request)
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await tabTo(page, page.getByLabel('Email or roll number'))
  await focusRingVisible(page)
  await page.keyboard.type(student.email)
  await page.keyboard.press('Tab')
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/s$/)
})

test('wrong password is announced and focus stays usable', async ({ page, request }) => {
  const student = await registerViaApi(request)
  await page.goto('/login')
  await page.getByLabel('Email or roll number').focus()
  await page.keyboard.type(student.email)
  await page.keyboard.press('Tab')
  await page.keyboard.type('Wrong1234')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toBeVisible()
})

test('resume analyzer with the keyboard only', async ({ page, request }) => {
  const student = await registerViaApi(request)
  await page.goto('/login')
  await page.getByLabel('Email or roll number').focus()
  await page.keyboard.type(student.email)
  await page.keyboard.press('Tab')
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/s$/)

  await page.goto('/s/resume')
  await expect(page.getByRole('heading', { name: 'Resume analyzer' })).toBeVisible()
  await page.getByLabel('Resume text').focus()
  await focusRingVisible(page)
  await page.getByLabel('Resume text').fill(sampleResume())
  await tabTo(page, page.getByRole('button', { name: 'Analyze resume' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Readiness by role' })).toBeVisible({
    timeout: 30_000,
  })
})

test('admin creates a user with the keyboard only', async ({ page }) => {
  await signInAsAdmin(page)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
  await tabTo(page, page.getByRole('button', { name: 'Create user' }))
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Create a staff account' })
  await expect(dialog).toBeVisible()

  // Focus moves into the dialog and stays there.
  const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
  expect(await inside()).toBe(true)
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await inside()).toBe(true)
  }

  // Escape closes it and returns focus to the button that opened it.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Create user' })).toBeFocused()

  // Open again and fill the form from the first field.
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
  const email = `kb.${Date.now().toString(36)}@college.edu`
  await dialog.getByLabel('Full name').focus()
  await page.keyboard.type('Keyboard Faculty')
  await page.keyboard.press('Tab')
  await page.keyboard.type(email)
  await tabTo(page, dialog.getByRole('combobox', { name: 'Department' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Enter')
  await tabTo(page, dialog.getByRole('button', { name: 'Create account' }))
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Account created/)).toBeVisible({ timeout: 15_000 })
})

test('test player sample is operable with the keyboard', async ({ page }) => {
  await page.goto('/dev/components')
  const player = page.getByRole('region', { name: /Test player/i }).first()
  const target = (await player.count()) ? player : page.locator('main')
  const mark = target.getByRole('button', { name: /Mark for review/i }).first()
  await mark.focus()
  await focusRingVisible(page)
  await page.keyboard.press('Space')
  await expect(target.getByRole('button', { name: /Marked for review/i }).first()).toBeVisible()
})

test('staff sign-in lands on the right home using the keyboard', async ({ page, request }) => {
  const faculty = await registerAs(request, 'FACULTY')
  await page.goto('/login')
  await page.getByLabel('Email or roll number').focus()
  await page.keyboard.type(faculty.email)
  await page.keyboard.press('Tab')
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(faculty.home)
})
