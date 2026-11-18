import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { registerAs, signIn } from './helpers.ts'

const FIXTURE = fileURLToPath(new URL('./fixtures/academic-import.csv', import.meta.url))

test('the drive form checks every field before it will save', async ({ page, request }) => {
  const tp = await registerAs(request, 'TP_HEAD')
  await signIn(page, tp.email, tp.home)
  await page.goto('/tp/drives/new')
  await expect(page.getByRole('heading', { name: 'New drive', level: 1 })).toBeVisible()

  // Nothing filled in.
  await page.getByRole('button', { name: 'Save drive' }).click()
  await expect(page.getByText('Enter the company name')).toBeVisible()
  await expect(page.getByText('Enter the role')).toBeVisible()
  await expect(page.getByText('Describe the job in at least 20 characters')).toBeVisible()
  await expect(page.getByText('Enter the CTC in lakh per year')).toBeVisible()
  await expect(page.getByText('Choose at least one department')).toBeVisible()
  await expect(page.getByText('Enter a four-digit graduation year')).toBeVisible()
  await expect(page.getByText('Name the stage')).toBeVisible()
  await expect(page.getByText('Choose the drive date')).toBeVisible()
  await expect(page.getByText(/Say where these criteria came from/)).toBeVisible()
  await expect(page.getByText("Saving isn't available yet", { exact: true })).toHaveCount(0)

  // Basic details, with values that are wrong in different ways.
  await page.getByLabel('Company').fill('Acme Systems')
  await page.getByLabel('Role', { exact: true }).fill('Associate Engineer')
  await page
    .getByLabel('Job description')
    .fill('Build and run backend services for the payments team.')
  await page.getByLabel('CTC (lakh per year)').fill('abc')
  await page.getByLabel('Location').fill('Hyderabad')
  await page.getByLabel('Drive date').fill('2020-01-01')
  await page.getByLabel('Graduation year').fill('2027')
  await page.getByLabel('Minimum CGPA (optional)').fill('12')
  await page.getByLabel('Maximum backlogs').fill('-1')
  await page.getByLabel('Source of criteria').fill('Company email, 12 Nov')
  await page.getByRole('button', { name: 'Save drive' }).click()
  await expect(page.getByText('Enter the CTC in lakh per year')).toBeVisible()
  await expect(page.getByText('Choose today or a later date')).toBeVisible()
  await expect(page.getByText('Minimum CGPA must be a number from 0 to 10')).toBeVisible()
  await expect(page.getByText('Enter the maximum backlogs, 0 for none')).toBeVisible()

  // Departments and skills come from the real API.
  await page.getByRole('button', { name: 'Eligible departments' }).click()
  await page.getByRole('option').first().click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('list', { name: 'Selected eligible departments' })).toBeVisible()

  await page.getByRole('button', { name: 'Required skills' }).click()
  await page.getByRole('combobox', { name: 'Search Required skills' }).fill('Python')
  await page.getByRole('option', { name: 'Python', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Remove Python' })).toBeVisible()

  // Stages can be added, named and reordered.
  await page.getByLabel('Stage 1 name').fill('Online test')
  await page.getByRole('button', { name: 'Add stage' }).click()
  await page.getByLabel('Stage 2 name').fill('Online test')
  await page.getByRole('button', { name: 'Save drive' }).click()
  await expect(page.getByText('Stage names must be different')).toBeVisible()
  await page.getByLabel('Stage 2 name').fill('Interview')
  await page.getByRole('button', { name: 'Move stage 2 up' }).click()
  await expect(page.getByLabel('Stage 1 name')).toHaveValue('Interview')

  // Fix the remaining fields: now it is valid and saving is refused honestly.
  await page.getByLabel('CTC (lakh per year)').fill('8.5')
  const next = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Drive date').fill(next)
  await page.getByLabel('Minimum CGPA (optional)').fill('7')
  await page.getByLabel('Maximum backlogs').fill('0')
  await page.getByRole('button', { name: 'Save drive' }).click()
  await expect(page.getByText("Saving isn't available yet", { exact: true })).toBeVisible()
})

test.describe('academic import', () => {
  test('maps the columns and reports problems from the file alone', async ({ page, request }) => {
    const tp = await registerAs(request, 'TP_HEAD')
    await signIn(page, tp.email, tp.home)
    await page.goto('/tp/academic-import')
    await expect(page.getByText('Drop a CSV file here')).toBeVisible()

    // Anything that is not a CSV is refused before it is read.
    await page.getByLabel('CSV file').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByRole('alert')).toContainText('Choose a .csv file')

    // Upload nothing: watch that no request leaves for the file.
    const uploads: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' && r.url().includes('/api/')) uploads.push(r.url())
    })
    await page.getByLabel('CSV file').setInputFiles(FIXTURE)

    // The headers "Reg No", "Active Backlogs" and "Passout Year" are matched automatically.
    await expect(page.getByText('academic-import.csv')).toBeVisible()
    await expect(page.getByText(/7 student rows, 5 columns/)).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Roll number' })).toHaveText('Reg No')
    await expect(page.getByRole('combobox', { name: 'CGPA' })).toHaveText('CGPA')
    await expect(page.getByRole('combobox', { name: 'Backlogs' })).toHaveText('Active Backlogs')
    await expect(page.getByRole('combobox', { name: 'Graduation year' })).toHaveText('Passout Year')

    // The report: 3 good rows; bad CGPA, a repeat, an unknown roll number and bad backlogs.
    const stat = (label: string) =>
      page.getByText(label, { exact: true }).first().locator('xpath=..')
    await expect(stat('Rows in file')).toContainText('7')
    await expect(stat('Valid rows')).toContainText('3')
    await expect(stat('Rows with errors')).toContainText('4')
    await expect(stat('Invalid format')).toContainText('1')
    await expect(page.getByRole('cell', { name: 'Must be a number from 0 to 10' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Repeated, first seen on line 2' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Not a valid roll number' })).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Must be a whole number from 0 to 50' }),
    ).toBeVisible()
    await expect(page.getByText('line 6: ??')).toBeVisible()

    // Remapping changes the result: the name column is not a CGPA, so no row stays valid.
    await page.getByRole('combobox', { name: 'CGPA' }).click()
    await page.getByRole('option', { name: 'Name' }).click()
    await expect(stat('Valid rows')).toContainText('0')
    await expect(page.getByRole('button', { name: /^Import/ })).toBeDisabled()

    // Unmatching a column hides the report until all four are matched again.
    await page.getByRole('combobox', { name: 'CGPA' }).click()
    await page.getByRole('option', { name: 'Not matched' }).click()
    await expect(
      page.getByText('Match all four columns to see the validation report.'),
    ).toBeVisible()
    await page.getByRole('combobox', { name: 'CGPA' }).click()
    await page.getByRole('option', { name: 'CGPA', exact: true }).click()
    await expect(stat('Valid rows')).toContainText('3')

    // Importing is not available yet, and nothing was uploaded.
    await page.getByRole('button', { name: 'Import 3 rows' }).click()
    await expect(page.getByText("Saving isn't available yet", { exact: true })).toBeVisible()
    expect(uploads).toEqual([])
  })
})

test.describe('review screenshots', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  })

  test('the eligibility sample in the component catalogue at 1280px, light', async ({ page }) => {
    await page.goto('/dev/components')
    const section = page.locator('#dev-eligibility').locator('xpath=..')
    await expect(page.getByText('Sample Student C').first()).toBeVisible()
    await page.getByRole('button', { name: 'Why for Sample Student C' }).first().click()
    await section.screenshot({ path: 'e2e/screenshots/dev-eligibility-1280-light.png' })
  })

  test('the academic import with a file loaded, at 1280px, light', async ({ page, request }) => {
    const tp = await registerAs(request, 'TP_HEAD')
    await signIn(page, tp.email, tp.home)
    await page.goto('/tp/academic-import')
    await page.getByLabel('CSV file').setInputFiles(FIXTURE)
    await expect(page.getByText('Valid rows')).toBeVisible()
    await page.screenshot({
      path: 'e2e/screenshots/tp-import-loaded-1280-light.png',
      fullPage: true,
    })
  })
})
