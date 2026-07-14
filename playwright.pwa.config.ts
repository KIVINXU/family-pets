import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testMatch: "pwa-offline.spec.ts",
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  use: {
    ...baseConfig.use,
    baseURL: "http://127.0.0.1:4175",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
