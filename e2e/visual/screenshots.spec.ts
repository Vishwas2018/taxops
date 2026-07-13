import { test } from "@playwright/test";
import { fillNumberField } from "../lib/form";
import { createE2ESupabaseAdminClient, getE2EUserId, resetE2EUserData } from "../lib/supabase-admin";

/**
 * Not snapshot-diff tests (no flake budget for that in v1 - see PROGRESS.md Day 9) - just
 * full-page screenshots of every major surface, captured as committed review artifacts under
 * e2e/screenshots/ so a human can retire the "never actually looked at it in a browser" gap
 * every prior day's PROGRESS.md flagged. Re-run and re-commit whenever a surface changes
 * meaningfully; there's no pass/fail assertion here by design.
 */
test.use({ viewport: { width: 1280, height: 900 } });

async function shoot(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

test("capture marketing home", async ({ page }) => {
  await page.goto("/");
  await shoot(page, "01-marketing-home");
});

test.describe("unauthenticated surfaces", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("capture auth surfaces", async ({ page }) => {
    await page.goto("/sign-up");
    await shoot(page, "02-auth-sign-up");
    await page.goto("/sign-in");
    await shoot(page, "03-auth-sign-in");
  });
});

test("capture dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await shoot(page, "04-dashboard");
});

test("capture tax profile wizard step", async ({ page }) => {
  // Reset first: `/profile` shows the summary/edit view once any answer exists (which the
  // shared E2E user will have, left by other specs in the same run) rather than the fresh
  // multi-step wizard this screenshot is meant to show - caught during Day 10's screenshot
  // review, when 05-profile-wizard-step.png turned out to be the summary view.
  const admin = createE2ESupabaseAdminClient();
  const userId = await getE2EUserId(admin);
  await resetE2EUserData(admin, userId);

  await page.goto("/profile");
  await shoot(page, "05-profile-wizard-step");
});

test("capture contractor take-home calculator with results", async ({ page }) => {
  await page.goto("/calculators/contractor-take-home");
  await fillNumberField(page.getByLabel("Day rate ($)"), "800");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await shoot(page, "06-calculator-contractor-take-home");
});

test("capture division 293 calculator with results", async ({ page }) => {
  await page.goto("/calculators/div-293");
  await fillNumberField(page.getByLabel("Income for Division 293 purposes ($)"), "240000");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await shoot(page, "07-calculator-div-293");
});

test("capture property cash flow calculator with results", async ({ page }) => {
  await page.goto("/calculators/property-cash-flow");
  await fillNumberField(page.getByLabel("Weekly rent ($)"), "550");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await shoot(page, "08-calculator-property-cash-flow");
});

test("capture tips index and article", async ({ page }) => {
  await page.goto("/tips");
  await shoot(page, "09-tips-index");
  await page.goto("/tips/claiming-work-related-expenses-as-a-contractor");
  await shoot(page, "10-tips-article");
});

test("capture checklists", async ({ page }) => {
  await page.goto("/checklists");
  await shoot(page, "11-checklists");
});
