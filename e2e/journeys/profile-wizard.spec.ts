import { test, expect } from "@playwright/test";
import { STANDARD_DISCLAIMER } from "@/lib/disclaimers";
import { createE2ESupabaseAdminClient, getE2EUserId, resetE2EUserData } from "../lib/supabase-admin";

// Authenticated (shared storageState). Forces a blank profile first so `/profile` renders the
// fresh multi-step wizard rather than the summary/edit view a prior spec's answers would trigger
// - see resetE2EUserData's doc comment.
test.beforeEach(async () => {
  const admin = createE2ESupabaseAdminClient();
  const userId = await getE2EUserId(admin);
  await resetE2EUserData(admin, userId);
});

test("wizard: skip a step, answer 0 properties explicitly, and the checklist regression pin holds", async ({
  page,
}) => {
  await page.goto("/profile");

  // Step 1: Work arrangement - answered.
  await expect(page.getByText("Step 1 of 6: Work arrangement")).toBeVisible();
  // Not `exact: true`: @base-ui/react's own internal label association plus this app's
  // explicit `aria-label` fix (added for the axe "aria-toggle-field-name" finding - see
  // PROGRESS.md Day 9) can compute a doubled accessible name ("PAYG employee PAYG employee") in
  // Playwright's own name-matching, though not for axe/real screen readers, which prioritize
  // aria-labelledby over aria-label outright rather than concatenating. A substring match is
  // still unambiguous here (no other option contains "PAYG employee").
  await page.getByRole("radio", { name: "PAYG employee" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: ABN - deliberately skipped (the "skip a step" pin: Next works with no answer).
  await expect(page.getByText("Step 2 of 6: ABN")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: Investment properties - explicit "0" answer (yesterday's regression: this must
  // exclude the property-documents checklist group, not fall back to "show everything").
  await expect(page.getByText("Step 3 of 6: Investment properties")).toBeVisible();
  await page.getByRole("radio", { name: "0" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Steps 4-6: super engagement, household income, other income sources - all skipped.
  await expect(page.getByText("Step 4 of 6: Super engagement")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 5 of 6: Household income")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Step 6 of 6: Other income sources")).toBeVisible();
  await page.getByRole("button", { name: "Review" }).click();

  // Review step reflects both the answered and the skipped fields accurately.
  await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
  const workArrangementRow = page.locator("dl > div", { hasText: "Work arrangement" });
  await expect(workArrangementRow.getByText("PAYG employee")).toBeVisible();
  const abnRow = page.locator("dl > div", { hasText: "ABN" });
  await expect(abnRow.getByText("Not answered")).toBeVisible();
  const propertyRow = page.locator("dl > div", { hasText: "Investment properties" });
  await expect(propertyRow.getByText("0", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("heading", { name: "Profile saved" })).toBeVisible();
  await expect(page.getByRole("main").getByText(STANDARD_DISCLAIMER)).toBeVisible();

  // Regression pin (journey level): "0 properties" must keep the Property documents group out
  // of the checklist defaults, not fall back to showing every group.
  await page.goto("/checklists");
  await expect(page.getByRole("heading", { name: "Property documents" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Property documents/ })).toBeVisible();
});
