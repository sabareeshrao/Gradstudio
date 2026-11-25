import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui/browser",
  outputDir: "./test-results/ui-browser",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "test-results/ui-report", open: "never" }]],
  expect: { timeout: 10_000, toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    colorScheme: "light",
    locale: "en-US",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chrome", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet-chrome", use: { viewport: { width: 1024, height: 900 } } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"], channel: "chrome" } }
  ],
  webServer: {
    command: "node scripts/ui/serve-preview.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000
  }
});
