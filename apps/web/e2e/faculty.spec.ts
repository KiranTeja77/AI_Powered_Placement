import { expect, test } from '@playwright/test'
import { registerAs, signIn } from './helpers.ts'

test('the question form checks each question type before it will save', async ({
  page,
  request,
}) => {
  const faculty = await registerAs(request, 'FACULTY')
  await signIn(page, faculty.email, faculty.home)
  await page.goto('/f/questions/new')
  await expect(page.getByRole('heading', { name: 'New question', level: 1 })).toBeVisible()

  // Nothing filled in: every common field says what is missing.
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Write the question in at least 10 characters')).toBeVisible()
  await expect(page.getByText('Enter a topic')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Department' })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByText('Explain the answer in at least 10 characters')).toBeVisible()
  await expect(page.getByText('Enter the option text').first()).toBeVisible()
  await expect(page.getByText("Saving isn't available yet", { exact: true })).toHaveCount(0)

  // Common fields.
  await page
    .getByLabel('Question', { exact: true })
    .fill('Which structure has O(1) average lookup?')
  await page.getByLabel('Topic').fill('Data structures')
  await page.getByLabel('Department').click()
  await page.getByRole('option').first().click()
  await page.getByLabel('Explanation').fill('A hash table maps keys to buckets directly.')

  // Multiple choice, one answer: options need text, and exactly one must be marked correct.
  await page.getByLabel('Option 1 text').fill('Linked list')
  await page.getByLabel('Option 2 text').fill('Hash table')
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Mark exactly one correct option')).toBeVisible()

  await page.getByLabel('Option 2 text').fill('Linked list')
  await page.getByLabel('Option 2 is correct').click()
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Options must be different')).toBeVisible()

  // Marking another option moves the single correct answer instead of adding a second.
  await page.getByLabel('Option 2 text').fill('Hash table')
  await page.getByLabel('Option 1 is correct').click()
  await expect(page.getByLabel('Option 2 is correct')).not.toBeChecked()

  // A numeric question needs a number, and marks must be sensible.
  await page.getByLabel('Question type').click()
  await page.getByRole('option', { name: 'Numeric answer' }).click()
  await page.getByLabel('Marks').fill('0')
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Enter the correct number')).toBeVisible()
  await expect(page.getByText('Marks must be more than 0')).toBeVisible()

  // A coding question needs an expected output for every test case.
  await page.getByLabel('Question type').click()
  await page.getByRole('option', { name: 'Coding problem' }).click()
  await page.getByLabel('Marks').fill('5')
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText('Enter the expected output')).toBeVisible()
  await page.getByLabel('Test case 1 expected output').fill('42')

  // Valid now: saving is refused honestly rather than pretended.
  await page.getByRole('button', { name: 'Save question' }).click()
  await expect(page.getByText("Saving isn't available yet", { exact: true })).toBeVisible()
})
