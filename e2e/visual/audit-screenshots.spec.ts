import { expect, test } from "@playwright/test";
import { fillNumberField } from "../lib/form";
import { createE2ESupabaseAdminClient, getE2EUserId, resetE2EUserData } from "../lib/supabase-admin";

/**
 * One-off broader capture set for external design review (see PROGRESS.md Day 11.9) - not a
 * replacement for `screenshots.spec.ts`'s ongoing per-surface review artifact. Outputs to its
 * own `e2e/screenshots/audit/` folder so this batch doesn't get mixed up with (or overwrite)
 * the numbered set that doc already describes. Re-run whenever a fresh external-review batch is
 * needed - no pass/fail assertion on the screenshots themselves, same "review artifact, not a
 * snapshot diff" approach as the existing visual spec.
 */
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function shoot(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/audit/${name}.png`, fullPage: true });
}

test.describe("desktop captures", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("marketing home", async ({ page }) => {
    await page.goto("/");
    await shoot(page, "marketing-home");
  });

  test.describe("unauthenticated auth surfaces", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("sign-up and sign-in", async ({ page }) => {
      await page.goto("/sign-up");
      await shoot(page, "auth-sign-up");
      await page.goto("/sign-in");
      await shoot(page, "auth-sign-in");
    });
  });

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await shoot(page, "dashboard");
  });

  test("wizard step 1 empty, then with an option selected", async ({ page }) => {
    const admin = createE2ESupabaseAdminClient();
    const userId = await getE2EUserId(admin);
    await resetE2EUserData(admin, userId);

    await page.goto("/profile");
    await expect(page.getByText("Step 1 of 6: Work arrangement")).toBeVisible();
    await shoot(page, "wizard-step-1-empty");

    await page.getByRole("radio", { name: "PAYG employee" }).click();
    await shoot(page, "wizard-step-1-with-selection");
  });

  test("calculator: contractor take-home, filled with results", async ({ page }) => {
    await page.goto("/calculators/contractor-take-home");
    await fillNumberField(page.getByLabel("Day rate ($)"), "800");
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await shoot(page, "calculator-contractor-take-home-filled");
  });

  test("calculator: division 293, filled with results", async ({ page }) => {
    await page.goto("/calculators/div-293");
    await fillNumberField(page.getByLabel("Income for Division 293 purposes ($)"), "240000");
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await shoot(page, "calculator-div-293-filled");
  });

  test("calculator: property cash flow, filled with results", async ({ page }) => {
    await page.goto("/calculators/property-cash-flow");
    await fillNumberField(page.getByLabel("Weekly rent ($)"), "550");
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await shoot(page, "calculator-property-cash-flow-filled");
  });

  test("tips index excludes draft articles, plus an article page", async ({ page }) => {
    await page.goto("/tips");

    // Day 11 added 6 draft:true articles - none of them should ever reach this page. A real
    // assertion, not just an eyeballed screenshot: fail loudly if a draft title leaks through.
    const draftTitles = [
      "Home Office Running Costs for Contractors",
      "Tools, Equipment, and Depreciation for Contractors",
      "Interest Deductibility Basics for Investment Loans",
      "Depreciation Schedules and Quantity Surveyors",
      "Division 293 Tax, Explained Plainly",
      "Record-Keeping and Evidence for Capital Gains Tax",
    ];
    for (const title of draftTitles) {
      await expect(page.getByText(title)).toHaveCount(0);
    }

    await shoot(page, "tips-index");
    await page.goto("/tips/claiming-work-related-expenses-as-a-contractor");
    await shoot(page, "tips-article");
  });

  test("checklists: default state, then toggled with a custom item", async ({ page }) => {
    const admin = createE2ESupabaseAdminClient();
    const userId = await getE2EUserId(admin);
    // Only clears custom items, not check-state or profile - this test wants a deterministic
    // "exactly one custom item" end state across repeated runs, without disturbing whatever
    // toggle state another spec left on shared items.
    await admin.from("checklist_custom_items").delete().eq("user_id", userId);

    await page.goto("/checklists");
    const group = page.getByRole("region", { name: "Receipts & evidence" });
    await expect(group).toBeVisible();
    await shoot(page, "checklists-default");

    const item = group.getByRole("listitem").first();
    const checkbox = item.getByRole("checkbox");
    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await Promise.all([
        page.waitForResponse((res) => res.request().method() === "POST" && res.url().includes("/checklists")),
        checkbox.click(),
      ]);
    }

    await group.getByPlaceholder("e.g. 2019 depreciation schedule").fill("E2E audit custom item");
    await group.getByRole("button", { name: "Add item", exact: true }).click();
    await expect(group.locator("li", { hasText: "E2E audit custom item" })).toBeVisible();

    await shoot(page, "checklists-with-toggle-and-custom-item");
  });
});

test.describe("mobile captures (390px)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await shoot(page, "mobile-dashboard");
  });

  test("calculator: contractor take-home, filled", async ({ page }) => {
    await page.goto("/calculators/contractor-take-home");
    await fillNumberField(page.getByLabel("Day rate ($)"), "800");
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await shoot(page, "mobile-calculator-contractor-take-home");
  });

  test("wizard step 1", async ({ page }) => {
    const admin = createE2ESupabaseAdminClient();
    const userId = await getE2EUserId(admin);
    await resetE2EUserData(admin, userId);

    await page.goto("/profile");
    await expect(page.getByText("Step 1 of 6: Work arrangement")).toBeVisible();
    await shoot(page, "mobile-wizard-step-1");
  });
});
