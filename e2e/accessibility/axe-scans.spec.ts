import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { createE2ESupabaseAdminClient, getE2EUserId, resetE2EUserData } from "../lib/supabase-admin";

/** Fails on any WCAG 2.0/2.1 A or AA violation; anything only flagged under other rule sets
 * (best-practice, WCAG AAA) is reported but doesn't fail the run - those get triaged, not
 * gated on, per this task's scope. */
async function expectNoWcagAAViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
      .join("\n");
    console.log(`axe violations on ${page.url()}:\n${summary}`);
  }
  expect(results.violations).toEqual([]);
}

test("dashboard has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/dashboard");
  await expectNoWcagAAViolations(page);
});

test("contractor take-home calculator has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/calculators/contractor-take-home");
  await expectNoWcagAAViolations(page);
});

/**
 * Day 12 Part B: each calculator's results panel only exists in the DOM after Calculate is
 * clicked (conditionally rendered - see each `*-calculator.tsx`), and that panel is exactly
 * where this task's hero-gradient/glow treatment landed. The pre-existing scan above only ever
 * covered the empty-form state, so it would not have caught a contrast regression in the new
 * hero-styled results Card - these five scan the *filled* state specifically, on top of (not
 * instead of) the existing empty-form coverage. Every calculator's default form values are
 * already valid (see each `*-calculator.test.tsx`), so no field-filling is needed before
 * clicking Calculate.
 */
for (const { name, path } of [
  { name: "contractor take-home", path: "/calculators/contractor-take-home" },
  { name: "division 293", path: "/calculators/div-293" },
  { name: "property cash flow", path: "/calculators/property-cash-flow" },
  { name: "tax set-aside", path: "/calculators/tax-set-aside" },
  { name: "GST threshold projector", path: "/calculators/gst-threshold" },
]) {
  test(`${name} calculator results panel has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await expect(page.getByRole("region", { name: "Calculator results" })).toBeVisible();
    await expectNoWcagAAViolations(page);
  });
}

test("tax profile wizard step has no WCAG A/AA violations", async ({ page }) => {
  const admin = createE2ESupabaseAdminClient();
  const userId = await getE2EUserId(admin);
  await resetE2EUserData(admin, userId);

  await page.goto("/profile");
  await expectNoWcagAAViolations(page);
});

test("checklists has no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/checklists");
  await expectNoWcagAAViolations(page);
});
