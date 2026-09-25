import { test, expect } from '@playwright/test'

declare global {
  interface Window {
    gpuCounts: () => Record<string, number>
  }
}

test('GPU allocations remain bounded after StrictMode, resizes and lighting changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = new Map<string, Set<unknown>>()
    for (const kind of [
      'Texture',
      'Framebuffer',
      'Buffer',
      'Program',
      'Shader',
    ]) {
      const live = new Set<unknown>()
      counts.set(kind, live)
      for (const prototype of [
        WebGLRenderingContext.prototype,
        WebGL2RenderingContext.prototype,
      ]) {
        const methods = prototype as unknown as Record<
          string,
          (...args: unknown[]) => unknown
        >
        const create = methods[`create${kind}`]
        const remove = methods[`delete${kind}`]
        methods[`create${kind}`] = function (...args) {
          const resource = Reflect.apply(create, this, args)
          if (resource) live.add(resource)
          return resource
        }
        methods[`delete${kind}`] = function (resource) {
          live.delete(resource)
          return Reflect.apply(remove, this, [resource])
        }
      }
    }
    window.gpuCounts = () =>
      Object.fromEntries([...counts].map(([key, value]) => [key, value.size]))
  })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Random splats' }),
  ).toBeEnabled()
  const baseline = await page.evaluate(() => window.gpuCounts())
  expect(baseline.Buffer).toBe(2)
  expect(baseline.Shader).toBe(0)
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('Visual quality').selectOption('256')
    await page.setViewportSize({ width: 1100, height: 700 })
    await page.getByLabel('Bloom', { exact: true }).uncheck()
    await page.getByLabel('Shading', { exact: true }).uncheck()
    await page.getByLabel('Sunrays', { exact: true }).uncheck()
    await page.getByLabel('Visual quality').selectOption('1024')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByLabel('Bloom', { exact: true }).check()
    await page.getByLabel('Shading', { exact: true }).check()
    await page.getByLabel('Sunrays', { exact: true }).check()
  }
  await expect
    .poll(() => page.evaluate(() => window.gpuCounts()))
    .toEqual(baseline)
  expect(
    await page.evaluate(() =>
      document.querySelector('canvas')!.getContext('webgl2')!.getError(),
    ),
  ).toBe(0)
})

test('unavailable local storage does not prevent rendering or language changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    })
  })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Random splats' }),
  ).toBeEnabled()
  await page.getByLabel('语言 / Language').selectOption('zh')
  await expect(page.getByRole('button', { name: '随机泼洒' })).toBeEnabled()
})

test('corrupt saved settings recover and reduced-motion preference survives a reload', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    if (localStorage.getItem('fluid-lab.settings.v1') === null)
      localStorage.setItem('fluid-lab.settings.v1', '{broken')
  })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeEnabled()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeEnabled()
})
