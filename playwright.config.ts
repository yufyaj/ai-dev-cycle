import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* 並列実行 */
  fullyParallel: true,

  /* CI環境でのリトライ */
  retries: process.env.CI ? 2 : 0,

  /* 並列ワーカー数 */
  workers: process.env.CI ? 2 : undefined,

  /* Reporter */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list']
  ],

  /* 共通設定 */
  use: {
    /* ベースURL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* スクリーンショット・動画 */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* トレース */
    trace: 'retain-on-failure',

    /* タイムアウト */
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  /* テスト対象ブラウザ */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* タブレット対応（BRD要件） */
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
    },
  ],

  /* Webサーバー（開発時） */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
