// Settings for scripts/browser-test.mjs (node --test driving this machine's Chrome over DevTools).
export default {
  testDir: './tests',
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 3000,
      threshold: 0.3,
    },
  },
  projects: [
    { name: 'chromium', use: { viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
};
