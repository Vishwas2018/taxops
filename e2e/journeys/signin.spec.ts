import { test, expect } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../lib/supabase-admin";

// Unauthenticated: signs in as the already-seeded E2E user (created by auth.setup.ts) through
// the real form, but with a blank starting session rather than the shared storage state, so
// this actually exercises the sign-in form/action rather than skipping it.
test.use({ storageState: { cookies: [], origins: [] } });

test("signin with the seeded E2E user lands on the dashboard", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(E2E_USER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
