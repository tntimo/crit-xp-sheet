import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx serve . -l 4173 -n',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
