import { defineConfig, devices } from "@playwright/test";

// Runs against `next dev` (not a production build) against a locally running Supabase stack
// (`npx supabase start` is a precondition - see docs/e2e-testing.md), so auth/RLS behaviour is
// real, not mocked. Chromium only for v1 - no cross-browser matrix (see PROGRESS.md Day 9).
export default defineConfig({
  testDir: "./e2e",
  // 60s, not Playwright's 30s default: `next dev` (Turbopack) compiles each route on its first
  // hit, and the first spec to touch a given route (often the setup project, or whichever test
  // wins the race under `fullyParallel`) pays that cold-compile cost inline. Real per-action
  // timeouts (below) stay tighter.
  timeout: 60_000,
  // Not parallel: every spec shares one seeded E2E user/DB row (see e2e/lib/supabase-admin.ts) -
  // there's no per-test user provisioning, so two spec files mutating that user's profile or
  // checklist state at the same time would race. n=1 seeded user was the deliberate, simpler
  // choice per Simplicity First; serial execution is the isolation mechanism that makes it safe.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Seeds the dedicated E2E user (service-role client, bypasses email confirmation) and signs
    // in once via the real UI, saving the resulting cookies to e2e/.auth/user.json. Every other
    // project depends on this running first so most specs can start already authenticated.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
