import { expect, test } from '@playwright/test'
import { registerViaApi, signIn } from './helpers.ts'

// A fake camera and microphone, so the real check runs without hardware.
test.use({
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
  permissions: ['camera', 'microphone'],
})

test('Start unlocks only after consent, devices and full screen, then opens the test', async ({
  page,
  request,
}) => {
  const student = await registerViaApi(request)
  await signIn(page, student.email)
  await page.goto('/s/assessments/sample/start')
  const start = page.getByRole('button', { name: 'Start assessment' })
  await expect(start).toBeDisabled()

  await page.getByRole('checkbox', { name: /I have read what is monitored/ }).click()
  await expect(start).toBeDisabled()

  await page.getByRole('button', { name: 'Check camera and microphone' }).click()
  await expect(page.getByLabel('Camera preview')).toBeVisible()
  await expect(page.getByText('Camera and microphone are working.')).toBeVisible()
  await expect(start).toBeDisabled()

  await page.getByRole('button', { name: 'Enter full screen' }).click()
  await expect(page.getByRole('button', { name: 'Leave full screen' })).toBeVisible()
  await expect(start).toBeEnabled()

  await start.click()
  await expect(page).toHaveURL(/\/s\/assessments\/sample\/take$/)
  await expect(page.getByText('This assessment has no questions yet')).toBeVisible()
})
