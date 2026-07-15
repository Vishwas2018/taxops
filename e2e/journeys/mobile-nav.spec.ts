import { expect, test, type Page } from "@playwright/test";

/**
 * Day 11.9 audit CRITICAL finding: below `md`, the sidebar (`(app)/layout.tsx`) is hidden with
 * no replacement, leaving a signed-in mobile user with no way to move between app sections. This
 * covers the fix: a top-bar hamburger button opening a slide-over sheet (reusing the same
 * `@base-ui/react` Dialog primitive as `ui/dialog.tsx` - modal by default, so focus trap and
 * body scroll lock are the primitive's job, not hand-rolled here) listing the same
 * destinations as the desktop sidebar.
 */
test.use({ viewport: { width: 390, height: 844 } });

function bodyScrollLocked(page: Page) {
  return page.evaluate(() => {
    const htmlOverflow = getComputedStyle(document.documentElement).overflow;
    const bodyOverflow = getComputedStyle(document.body).overflow;
    return htmlOverflow === "hidden" || bodyOverflow === "hidden";
  });
}

test("open the mobile nav, navigate to checklists, and arrive there", async ({ page }) => {
  await page.goto("/dashboard");

  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();

  const nav = page.getByRole("dialog", { name: "Menu" });
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: "Checklists", exact: true }).click();

  await expect(page).toHaveURL(/\/checklists$/);
  await expect(nav).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "EOFY Checklists" })).toBeVisible();
});

test("the sheet lists the same destinations as the desktop sidebar", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const nav = page.getByRole("dialog", { name: "Menu" });
  for (const label of ["Dashboard", "Tax Profile", "Calculators", "Checklists", "Tips", "Tax Dates"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});

test("traps focus while open, locks body scroll, and Escape closes it", async ({ page }) => {
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();

  const nav = page.getByRole("dialog", { name: "Menu" });
  await expect(nav).toBeVisible();
  expect(await bodyScrollLocked(page)).toBe(true);

  // Tab all the way around - every focused element while the sheet is open must settle inside
  // it, never the sidebar-less dashboard content behind the overlay. `expect.poll` (rather than
  // a bare synchronous check) because Base UI's focus-guard redirect at the trap boundary lands
  // a tick after the native Tab keypress - polling waits for it to settle instead of racing it.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return !!dialog && !!active && dialog.contains(active);
        }),
      )
      .toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(nav).not.toBeVisible();
  expect(await bodyScrollLocked(page)).toBe(false);
  await expect(trigger).toBeFocused();
});
