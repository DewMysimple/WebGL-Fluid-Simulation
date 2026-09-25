import { test, expect, type Page } from '@playwright/test'
import { PNG } from 'pngjs'
import { readFile } from 'node:fs/promises'

async function ready(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Random splats' }),
  ).toBeEnabled()
}

async function downloadImage(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save image' }).click()
  const result = await download
  expect(result.suggestedFilename()).toMatch(/^fluid-.*\.png$/)
  return PNG.sync.read(await readFile((await result.path())!))
}

test('renders fluid, switches languages and persists settings without restarting the canvas', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await ready(page)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const image = await downloadImage(page)
  expect(Math.min(image.width, image.height)).toBe(1024)
  let colorful = 0
  for (let i = 0; i < image.data.length; i += 4)
    if (Math.max(image.data[i], image.data[i + 1], image.data[i + 2]) > 60)
      colorful++
  expect(colorful).toBeGreaterThan(500)
  await page.getByLabel('Visual quality').selectOption('256')
  await page.getByLabel('语言 / Language').selectOption('zh')
  await expect(page.getByRole('heading', { name: '流体实验室' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(
    page.getByRole('button', { name: '继续', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '流体实验室' })).toBeVisible()
  await expect(page.getByLabel('画面精度')).toHaveValue('256')
  expect(errors).toEqual([])
})

test('supports pointer painting, keyboard pause, clearing and transparent PNG export', async ({
  page,
}) => {
  await ready(page)
  await page.locator('canvas').focus()
  await page.keyboard.press('p')
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Clear canvas' }).click()
  await page.getByText('Image export', { exact: true }).click()
  await page.getByLabel('Transparent background').check()
  // Isolate alpha behavior from intentional bloom dithering noise.
  await page.getByLabel('Bloom', { exact: true }).uncheck()
  const blank = await downloadImage(page)
  expect(blank.data.every((value) => value === 0)).toBe(true)
  await page.mouse.move(230, 240)
  await page.mouse.down()
  await page.mouse.move(470, 350, { steps: 12 })
  await page.mouse.up()
  const painted = await downloadImage(page)
  expect(
    painted.data.some((value, index) => index % 4 === 3 && value > 0),
  ).toBe(true)
  await page.screenshot({ path: 'test-results/desktop-en.png' })
})

test('restores a lost WebGL context and keeps the chosen configuration', async ({
  page,
}) => {
  await ready(page)
  await page.getByLabel('Visual quality').selectOption('256')
  await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!
    const extension = gl.getExtension('WEBGL_lose_context')!
    extension.loseContext()
    setTimeout(() => extension.restoreContext(), 700)
  })
  await expect(page.getByRole('alert')).toContainText(
    'graphics connection was lost',
  )
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Random splats' }),
  ).toBeEnabled()
  await expect(page.getByLabel('Visual quality')).toHaveValue('256')
  expect(
    await page.evaluate(() =>
      document.querySelector('canvas')!.getContext('webgl2')!.getError(),
    ),
  ).toBe(0)
})

test('shows translated errors when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('does not support')
  await page.getByLabel('语言 / Language').selectOption('zh')
  await expect(page.getByRole('alert')).toContainText('不支持')
  await expect(page.getByRole('button', { name: '随机泼洒' })).toBeDisabled()
})

test('falls back to WebGL 1 with manual filtering', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
    const extension = WebGLRenderingContext.prototype.getExtension
    WebGLRenderingContext.prototype.getExtension = function (
      this: WebGLRenderingContext,
      name: string,
    ) {
      return name === 'OES_texture_half_float_linear'
        ? null
        : Reflect.apply(extension, this, [name])
    } as typeof extension
  })
  await ready(page)
  await expect(page.getByText('WebGL 1', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Compatibility mode is active.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByLabel('Bloom', { exact: true })).toBeDisabled()
  const result = await downloadImage(page)
  expect(
    result.data.some((value, index) => index % 4 !== 3 && value > 60),
  ).toBe(true)
  expect(
    await page.evaluate(() =>
      document.querySelector('canvas')!.getContext('webgl')!.getError(),
    ),
  ).toBe(0)
})

test('mobile layout supports touch, language switching and viewport changes', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'zh-CN',
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByRole('button', { name: '随机泼洒' })).toBeEnabled()
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await page.touchscreen.tap(160, 340)
  await page.getByRole('button', { name: '展开面板' }).click()
  await expect(page.getByLabel('画面精度')).toHaveValue('512')
  await page.getByLabel('语言 / Language').selectOption('en')
  await expect(page.getByRole('heading', { name: 'Fluid Lab' })).toBeVisible()
  await page.screenshot({ path: 'test-results/mobile-en.png' })
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(
    page.getByRole('button', { name: 'Random splats' }),
  ).toBeEnabled()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await context.close()
})
