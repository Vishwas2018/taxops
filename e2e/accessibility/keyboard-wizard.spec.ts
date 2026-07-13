import { test, expect, type Page } from "@playwright/test";
import { createE2ESupabaseAdminClient, getE2EUserId, resetE2EUserData } from "../lib/supabase-admin";

test.beforeEach(async () => {
  const admin = createE2ESupabaseAdminClient();
  const userId = await getE2EUserId(admin);
  await resetE2EUserData(admin, userId);
});

/** Reads the currently-focused element's computed outline - the actual visual proof of "focus
 * ring visible", not just an assumption from reading globals.css (see Day 6.5's global
 * `*:focus-visible` rule in src/app/globals.css). */
async function focusedOutline(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const style = getComputedStyle(el);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
}

/** Presses Tab (real keyboard input, not a programmatic `.focus()` jump) until a button with
 * the given accessible name is focused - robust to how many individually-tabbable controls sit
 * in between (a radiogroup has one tab stop; a checkbox list has one per item), which a
 * hardcoded Tab count would not be. */
async function tabToButton(page: Page, name: string): Promise<void> {
  for (let i = 0; i < 15; i++) {
    const focused = page.locator(":focus");
    if ((await focused.getAttribute("role")) !== "button" && (await focused.evaluate((el) => el.tagName)) !== "BUTTON") {
      await page.keyboard.press("Tab");
      continue;
    }
    if ((await focused.textContent())?.trim() === name) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Never reached a "${name}" button via Tab`);
}

test("full tax profile wizard journey is completable with keyboard only", async ({ page }) => {
  await page.goto("/profile");

  // The wizard moves programmatic focus to each step's heading on change (Day 7) - the very
  // first thing a keyboard/screen-reader user lands on, not the first Tab stop.
  await expect(page.locator(":focus")).toHaveText("Work arrangement");

  // Step 1: Work arrangement - Tab into the radio group, select the first option.
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("role", "radio");
  await page.keyboard.press("Space");
  await expect(page.locator(':focus[aria-checked="true"]')).toHaveAccessibleName(/PAYG employee/);

  // Tab out of the group to Next (the disabled Back button is skipped automatically) and check
  // the focus ring is actually visible here, not just present in the stylesheet.
  await tabToButton(page, "Next");
  const outline = await focusedOutline(page);
  expect(outline?.outlineStyle).toBe("solid");
  expect(outline?.outlineWidth).not.toBe("0px");
  await page.keyboard.press("Enter");

  // Step 2: ABN - deliberately skipped via keyboard (Tab straight past the radio group to Next).
  await expect(page.locator(":focus")).toHaveText("ABN");
  await tabToButton(page, "Next");
  await page.keyboard.press("Enter");

  // Step 3: Investment properties - "0" is the first option, so the first Tab stop lands on it.
  await expect(page.locator(":focus")).toHaveText("Investment properties");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAccessibleName(/^0/);
  await page.keyboard.press("Space");
  await tabToButton(page, "Next");
  await page.keyboard.press("Enter");

  // Steps 4-5: super engagement, household income - skipped.
  await expect(page.locator(":focus")).toHaveText("Super engagement");
  await tabToButton(page, "Next");
  await page.keyboard.press("Enter");
  await expect(page.locator(":focus")).toHaveText("Household income");
  await tabToButton(page, "Next");
  await page.keyboard.press("Enter");

  // Step 6: Other income sources (checkbox group, enclosing-label pattern) - toggle one via
  // keyboard and confirm it actually checks, not just receives focus.
  await expect(page.locator(":focus")).toHaveText("Other income sources");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("role", "checkbox");
  await expect(page.locator(":focus")).toHaveAccessibleName(/Dividends/);
  await page.keyboard.press("Space");
  await expect(page.locator(':focus[aria-checked="true"]')).toHaveAccessibleName(/Dividends/);

  await tabToButton(page, "Review");
  await page.keyboard.press("Enter");

  // Review step.
  await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
  await tabToButton(page, "Confirm");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Profile saved" })).toBeVisible();
});
