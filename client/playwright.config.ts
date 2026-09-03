import {
  defineConfig,
  devices,
} from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "node src/tests/helpers/start-e2e-server.mjs",
      cwd: "../server",
      url: "http://127.0.0.1:5000/api/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173",
      cwd: ".",
      url: "http://127.0.0.1:4173/login",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
});
