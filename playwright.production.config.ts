import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'production.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:4174/fluid/',
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4174 --strictPort --base /fluid/',
    url: 'http://127.0.0.1:4174/fluid/',
    reuseExistingServer: false,
  },
})
