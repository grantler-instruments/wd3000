import { defineConfig, devices } from "@playwright/test";

const APP_URL = "http://localhost:1420/wd3000/app/";

// CI already runs `npm run build` before e2e; locally build once then preview.
const preview = "npm run preview -- --port 1420 --strictPort";
const webServerCommand = process.env.CI ? preview : `npm run build && ${preview}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: APP_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
