import { test, expect } from "@playwright/test";

// Unauthenticated: proves proxy.ts's fail-closed matcher (src/proxy.ts) in a real browser -
// every prior day's PROGRESS.md flagged this exact click-through as untested.
test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated /dashboard redirects to sign-in with redirectTo", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL(/\/sign-in\?redirectTo=%2Fdashboard/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("public /tips is reachable without signing in", async ({ page }) => {
  const response = await page.goto("/tips");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Tax Tips" })).toBeVisible();
  expect(page.url()).not.toContain("/sign-in");
});
