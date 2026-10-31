import { defineConfig } from "vitest/config";
import path from "node:path";
import { config } from "dotenv";

config();
const testDb = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: testDb ?? "",
      NEXVO_FAST_HASH: "1",
      UPLOAD_DIR: "./.data/test-uploads",
      PAYMENT_WEBHOOK_SECRET: "test-webhook-secret-0123456789",
      // Synthetic 32-byte key for tests only.
      APP_ENCRYPTION_KEY: "dGVzdC1vbmx5LWtleS0wMTIzNDU2Nzg5YWJjZGVmMDE=",
    },
  },
});
