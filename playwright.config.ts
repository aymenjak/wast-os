import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config();
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      UPLOAD_DIR: "./.data/e2e-uploads",
      NEXVO_E2E: "1",
      RATE_LIMIT_SCALE: "50",
      APP_URL: `http://localhost:${PORT}`,
      PAYMENT_WEBHOOK_SECRET: "e2e-webhook-secret-0123456789",
      // Synthetic test-only key (same public value as vitest.config.ts); CI has no .env, so the server needs it here.
      APP_ENCRYPTION_KEY: "dGVzdC1vbmx5LWtleS0wMTIzNDU2Nzg5YWJjZGVmMDE=",
    },
  },
});
