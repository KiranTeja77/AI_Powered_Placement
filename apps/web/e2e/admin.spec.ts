import { expect, test } from '@playwright/test'
import {
  adminCredentials,
  PASSWORD,
  registerAs,
  setPasswordToken,
  signIn,
  signInAsAdmin,
} from './helpers.ts'

function newEmail() {
  return `e2e.invited.${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}@college.edu`
}

test('an admin creates a faculty user, who sets a password from the email and lands on /f', async ({
  page,
  browser,
  request,
}) => {
  // Two people in two browsers, several slow sign-ins and an email in between.
  test.setTimeout(180_000)
  await signInAsAdmin(page)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()

  // The form checks itself before anything is sent.
  await page.getByRole('button', { name: 'Create user' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create a staff account' })
  await dialog.getByRole('button', { name: 'Create account' }).click()
  await expect(dialog.getByText('Enter the full name')).toBeVisible()
  await expect(dialog.getByText('Enter a valid email address')).toBeVisible()
  await expect(dialog.getByText('Choose the department')).toBeVisible()
  // There is no password field: the person chooses their own.
  await expect(dialog.getByLabel(/password/i)).toHaveCount(0)

  const email = newEmail()
  await dialog.getByLabel('Full name').fill('Dr Invited Faculty')
  await dialog.getByLabel('Email').fill(email)
  await dialog.getByRole('combobox', { name: 'Department' }).click()
  await page.getByRole('option').first().click()
  await dialog.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByText(/Account created\. A link to set a password was emailed to/),
  ).toBeVisible()
  await expect(dialog).toHaveCount(0)

  // The new account is in the list, active, and has never signed in.
  await page.getByLabel('Search users').fill(email)
  const row = page.getByRole('row', { name: new RegExp(email) })
  await expect(row).toContainText('Faculty')
  await expect(row).toContainText('Active')
  await expect(row).toContainText('Never')

  // Before the link is used nobody can sign in.
  const other = await browser.newContext()
  const faculty = await other.newPage()
  await faculty.goto('/login')
  await faculty.getByLabel('Email or roll number').fill(email)
  await faculty.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await faculty.getByRole('button', { name: 'Sign in' }).click()
  await expect(faculty.getByRole('alert')).toBeVisible()
  await expect(faculty).toHaveURL(/\/login$/)

  // The email is in Mailpit. Its link opens the set-password page.
  const token = await setPasswordToken(request, email)
  await faculty.goto(`/set-password?token=${token}`)
  await expect(faculty.getByRole('heading', { name: 'Set your password' })).toBeVisible()
  await faculty.getByLabel('New password', { exact: true }).fill('abc')
  await faculty.getByLabel('Confirm new password').fill('abc')
  await faculty.getByRole('button', { name: 'Set password' }).click()
  await expect(
    faculty.getByText('Use at least 8 characters with a letter and a number').first(),
  ).toBeVisible()

  await faculty.getByLabel('New password', { exact: true }).fill(PASSWORD)
  await faculty.getByLabel('Confirm new password').fill(PASSWORD)
  await faculty.getByRole('button', { name: 'Set password' }).click()
  await expect(faculty).toHaveURL(/\/login$/)
  await expect(faculty.getByText('Password set. Sign in to continue.')).toBeVisible()

  // The link works once.
  await faculty.goto(`/set-password?token=${token}`)
  await faculty.getByLabel('New password', { exact: true }).fill(PASSWORD)
  await faculty.getByLabel('Confirm new password').fill(PASSWORD)
  await faculty.getByRole('button', { name: 'Set password' }).click()
  await expect(faculty.getByRole('heading', { name: 'This link is not valid' })).toBeVisible()

  // Signed in with the password they chose, they land on the faculty home.
  await signIn(faculty, email, /\/f$/)
  await expect(faculty.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible()
  await other.close()
})

test('deactivating a user ends their session, and an admin cannot deactivate themselves', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000)
  const staff = await registerAs(request, 'FACULTY')
  const other = await browser.newContext()
  const faculty = await other.newPage()
  await signIn(faculty, staff.email, staff.home)
  await expect(faculty.getByRole('button', { name: 'Account menu' })).toBeVisible()

  await signInAsAdmin(page)
  await page.goto('/admin/users')
  await page.getByLabel('Search users').fill(staff.email)
  const row = page.getByRole('row', { name: new RegExp(staff.email) })
  await expect(row).toContainText('Active')

  // Cancelling changes nothing.
  await row.getByRole('button', { name: /Deactivate/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Deactivate this account' })
  await expect(dialog).toContainText('signed out on every device straight away')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(row).toContainText('Active')

  await row.getByRole('button', { name: /Deactivate/ }).click()
  await dialog.getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByText(`${staff.name} deactivated`)).toBeVisible()
  await expect(row).toContainText('Inactive')

  // The deactivated user's session is over: the next page load cannot refresh it.
  await faculty.reload()
  await expect(faculty).toHaveURL(/\/login$/)
  // And they cannot sign back in.
  await faculty.getByLabel('Email or roll number').fill(staff.email)
  await faculty.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await faculty.getByRole('button', { name: 'Sign in' }).click()
  await expect(faculty.getByRole('alert')).toContainText(/deactivated/i)

  // Activating again lets them in.
  await row.getByRole('button', { name: /Activate/ }).click()
  await page
    .getByRole('dialog', { name: 'Activate this account' })
    .getByRole('button', { name: 'Activate' })
    .click()
  await expect(row).toContainText('Active')
  await faculty.getByRole('button', { name: 'Sign in' }).click()
  await expect(faculty).toHaveURL(staff.home)
  await other.close()

  // An admin's own row cannot be deactivated.
  await page.getByLabel('Search users').fill(adminCredentials().email)
  const self = page.getByRole('row', { name: /Administrator/ })
  await expect(self.getByRole('button', { name: /Deactivate/ })).toBeDisabled()
})

test('only admins reach the admin screens', async ({ page, request }) => {
  const staff = await registerAs(request, 'FACULTY')
  await signIn(page, staff.email, staff.home)
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/403$/)
})

test.describe('review screenshots', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  })

  test('users with the create dialog open at 1280px, light', async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByRole('dialog', { name: 'Create a staff account' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/admin-users-create-1280-light.png' })
  })

  test('the recruiter drive page at 1280px, light', async ({ page, request }) => {
    const recruiter = await registerAs(request, 'RECRUITER')
    await signIn(page, recruiter.email, recruiter.home)
    await page.goto('/r/drives/sample')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.screenshot({
      path: 'e2e/screenshots/recruiter-drive-1280-light.png',
      fullPage: true,
    })
  })

  test('the recruiter candidates sample in the component catalogue at 1280px, light', async ({
    page,
  }) => {
    await page.goto('/dev/components')
    const section = page.locator('#dev-candidates').locator('xpath=..')
    await expect(section.getByText('Sample Student A').first()).toBeVisible()
    await section.screenshot({ path: 'e2e/screenshots/dev-recruiter-candidates-1280-light.png' })
  })
})
