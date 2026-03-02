import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

