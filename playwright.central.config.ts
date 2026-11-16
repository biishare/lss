import { randomBytes } from "node:crypto";
import { defineConfig } from "@playwright/test";

const origin = "http://127.0.0.1:3108";
process.env.LSS_TEST_PASSWORD ??= randomBytes(24).toString("base64url");

export default defineConfig({
  testDir: "./tests/central-browser",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: origin,
    viewport: { width: 1440, height: 900 },
    locale: "pt-PT",
    timezoneId: "Africa/Maputo",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    launchOptions: { executablePath: process.env.LSS_TEST_CHROMIUM },
  },
  webServer: {
    command: "node tests/central-browser/stack.mjs",
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 8000 },
  },
});
