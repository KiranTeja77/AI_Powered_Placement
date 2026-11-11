import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'E2eSecret42'

/** Unique per run so repeated runs against the same database do not collide. */
function newStudent() {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  return {
    email: `e2e.${id}@college.edu`,
    rollNo: `E2E${id}`.toUpperCase().slice(0, 20),
    name: 'E2E Student',
  }
}

async function register(page: Page, student: ReturnType<typeof newStudent>) {
  await page.goto('/register')
  await page.getByLabel('Full name').fill(student.name)
  await page.getByLabel('College email').fill(student.email)
  await page.getByLabel('Roll number').fill(student.rollNo)
  await page.getByLabel('Department').click()
  await page.getByRole('option', { name: /CSE/ }).click()
  await page.getByLabel('Graduation year').fill('2027')
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Account created. Sign in to continue.')).toBeVisible()
}

async function signIn(page: Page, identifier: string) {
  await page.getByLabel('Email or roll number').fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('student registers, signs in, lands on /s and signs out', async ({ page }) => {
  const student = newStudent()
  await register(page, student)

  await signIn(page, student.email)
  await expect(page).toHaveURL(/\/s$/)
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()

  // The session survives a reload through the silent refresh.
  await page.reload()
  await expect(page).toHaveURL(/\/s$/)
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible()

  // The access token is never persisted to web storage.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
  expect(stored).not.toMatch(/eyJ/)

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // Signed out: protected pages bounce back to sign-in.
  await page.goto('/s')
  await expect(page).toHaveURL(/\/login$/)
})

test('a student opening another role area gets /403', async ({ page }) => {
  const student = newStudent()
  await register(page, student)
  await signIn(page, student.rollNo)
  await expect(page).toHaveURL(/\/s$/)

  for (const path of ['/admin', '/f/students', '/tp/drives', '/r']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/403$/)
    await expect(page.getByRole('heading', { name: 'You do not have access' })).toBeVisible()
  }
})

test('wrong password shows an error and stays on the page', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email or roll number').fill('nobody@college.edu')
  await page.getByLabel('Password', { exact: true }).fill('Wr0ngPassword')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('incorrect')
  await expect(page).toHaveURL(/\/login$/)
})

test('changing the password signs the user out and the new password works', async ({ page }) => {
  const student = newStudent()
  await register(page, student)
  await signIn(page, student.email)
  await expect(page).toHaveURL(/\/s$/)
  await page.goto('/settings/account')

  await page.getByLabel('Current password').fill(PASSWORD)
  await page.getByLabel('New password', { exact: true }).fill('N3wSecretPass')
  await page.getByLabel('Confirm new password').fill('N3wSecretPass')
  await page.getByRole('button', { name: 'Change password' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Password changed. Sign in with your new password.')).toBeVisible()

  await page.getByLabel('Email or roll number').fill(student.email)
  await page.getByLabel('Password', { exact: true }).fill('N3wSecretPass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/s$/)
})

test('forgot password always shows the same confirmation', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Email').fill('not.a.real.account@college.edu')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/If an account exists for/)).toBeVisible()
})
