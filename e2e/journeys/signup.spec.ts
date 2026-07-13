import { test, expect } from "@playwright/test";

// Unauthenticated: a throwaway email per run, real signup flow, no seeded/stored session.
// Local Supabase has `enable_confirmations = false` (supabase/config.toml) - the whole point of
// disabling it locally is that this flow doesn't depend on a real mail provider, so signUp
// returns a session immediately and the app redirects straight to /dashboard.
test.use({ storageState: { cookies: [], origins: [] } });

test("signup with a new email lands on the dashboard", async ({ page }) => {
  const email = `e2e-signup-${Date.now()}@taxops.local`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("throwaway-password-123");
  await page.getByLabel("Confirm password").fill("throwaway-password-123");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
