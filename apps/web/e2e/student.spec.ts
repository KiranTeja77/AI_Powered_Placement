import { expect, test } from '@playwright/test'
import { registerViaApi, signIn } from './helpers.ts'

test('the onboarding wizard validates early steps and saves career interests for real', async ({
  page,
  request,
}) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/onboarding')

  // Step 1 is prefilled from the account. Saving is not available, and the app says so.
  await expect(page.getByText('Step 1 of 4: Department and year')).toBeVisible()
  await expect(page.getByLabel('Graduation year')).toHaveValue(/\d{4}/)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText("Saving isn't available yet")).toBeVisible()

  // Step 2 is validated before it moves on.
  await expect(page.getByText('Step 2 of 4: Education')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Enter your degree')).toBeVisible()
  await expect(page.getByText('Step 2 of 4: Education')).toBeVisible()
  await page.getByLabel('Degree').fill('B.Tech')
  await page.getByLabel('College').fill('Our College')
  await page.getByLabel('CGPA').fill('11')
  await page.getByLabel('12th percentage').fill('91')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('CGPA cannot be above 10')).toBeVisible()
  await page.getByLabel('CGPA').fill('8.4')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 3 is real: the choice is saved on the server.
  await expect(page.getByText('Step 3 of 4: Career interests')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Data Analyst' }).click()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  // Step 4 is the real resume form.
  await expect(page.getByText('Step 4 of 4: Resume')).toBeVisible()
  await expect(page.getByLabel('Resume text')).toBeVisible()
  await page.getByRole('button', { name: 'Finish without analyzing' }).click()
  await expect(page).toHaveURL(/\/s$/)

  await page.goto('/s/career')
  await expect(page.getByRole('button', { name: /Remove interest in Data Analyst/ })).toBeVisible()
})

test.describe('camera and microphone check', () => {
  test('a blocked camera is explained, and Start stays disabled', async ({ page, request }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
    })
    const student = await registerViaApi(request)
    await signIn(page, student.email)
    await page.goto('/s/assessments/sample/start')

    await page.getByRole('button', { name: 'Check camera and microphone' }).click()
    await expect(page.getByRole('alert')).toContainText('Camera and microphone access is blocked')
    await expect(page.getByRole('alert')).toContainText('Allow access for this site')
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start assessment' })).toBeDisabled()
  })

  test('missing and busy devices each get their own message', async ({ page, request }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('No device', 'NotFoundError'))
    })
    const student = await registerViaApi(request)
    await signIn(page, student.email)
    await page.goto('/s/assessments/sample/start')
    await page.getByRole('button', { name: 'Check camera and microphone' }).click()
    await expect(page.getByRole('alert')).toContainText('No camera or microphone was found')

    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Busy', 'NotReadableError'))
    })
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('alert')).toContainText('being used by another app')
  })
})

test.describe('review screenshots', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  })

  test('the pre-test page at 1280px, light', async ({ page, request }) => {
    const student = await registerViaApi(request)
    await signIn(page, student.email)
    await page.goto('/s/assessments/sample/start')
    await expect(page.getByRole('heading', { name: 'Before you start', level: 1 })).toBeVisible()
    await page.screenshot({
      path: 'e2e/screenshots/assessment-start-1280-light.png',
      fullPage: true,
    })
  })

  test('the test player sample in the component catalogue at 1280px, light', async ({ page }) => {
    await page.goto('/dev/components')
    const section = page.locator('#dev-test-player').locator('xpath=..')
    await expect(page.getByRole('timer')).toBeVisible()
    await section.screenshot({ path: 'e2e/screenshots/dev-test-player-1280-light.png' })
  })
})
