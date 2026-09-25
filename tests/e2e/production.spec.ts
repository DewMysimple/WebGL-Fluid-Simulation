import { test, expect } from '@playwright/test'

test('production assets load under a subdirectory and render in both languages', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => errors.push(request.url()))
  await page.goto('./')
  await expect(page.getByRole('button', { name: '随机泼洒' })).toBeEnabled()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await page.getByRole('button', { name: '随机泼洒' }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await page.screenshot({ path: 'test-results/production-zh.png' })
  await page.getByLabel('语言 / Language').selectOption('en')
  await expect(page.getByRole('heading', { name: 'Fluid Lab' })).toBeVisible()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(() =>
      document.querySelector('canvas')!.getContext('webgl2')!.getError(),
    ),
  ).toBe(0)
})
