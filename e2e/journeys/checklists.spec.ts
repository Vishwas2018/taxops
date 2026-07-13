import { test, expect } from "@playwright/test";

// Authenticated (shared storageState). Targets the "Receipts & evidence" group specifically -
// it's in ALWAYS_DEFAULT_GROUP_IDS (src/lib/checklists/select.ts), so it's visible regardless
// of whatever tax-profile answers another spec file left on the shared E2E user.
const GROUP_NAME = "Receipts & evidence";

test("toggling a checklist item persists across a reload", async ({ page }) => {
  await page.goto("/checklists");
  const group = page.getByRole("region", { name: GROUP_NAME });
  await expect(group).toBeVisible();

  const item = group.getByRole("listitem").first();
  const checkbox = item.getByRole("checkbox");
  const wasChecked = (await checkbox.getAttribute("aria-checked")) === "true";

  await checkbox.click();
  await expect(checkbox).toHaveAttribute("aria-checked", String(!wasChecked));

  await page.reload();
  const groupAfterReload = page.getByRole("region", { name: GROUP_NAME });
  const checkboxAfterReload = groupAfterReload.getByRole("listitem").first().getByRole("checkbox");
  await expect(checkboxAfterReload).toHaveAttribute("aria-checked", String(!wasChecked));

  // Restore original state so this test is idempotent across repeated local runs.
  await checkboxAfterReload.click();
  await expect(checkboxAfterReload).toHaveAttribute("aria-checked", String(wasChecked));
});

test("add, edit, and delete a custom checklist item", async ({ page }) => {
  await page.goto("/checklists");
  const group = page.getByRole("region", { name: GROUP_NAME });
  await expect(group).toBeVisible();

  const label = `E2E custom item ${Date.now()}`;
  await group.getByPlaceholder("e.g. 2019 depreciation schedule").fill(label);
  await group.getByRole("button", { name: "Add item", exact: true }).click();

  const customRow = group.locator("li", { hasText: label });
  await expect(customRow).toBeVisible();

  const editedLabel = `${label} (edited)`;
  await customRow.getByRole("button", { name: "Edit", exact: true }).click();
  const editInput = group.getByRole("textbox", { name: "Edit item name" });
  await editInput.fill(editedLabel);
  await group.getByRole("button", { name: "Save", exact: true }).click();

  const editedRow = group.locator("li", { hasText: editedLabel });
  await expect(editedRow).toBeVisible();

  await editedRow.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator("li", { hasText: editedLabel })).toHaveCount(0);
});
