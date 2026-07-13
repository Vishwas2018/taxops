import { test, expect } from "@playwright/test";

const SLUG = "claiming-work-related-expenses-as-a-contractor";

test("tips article renders FY badge, sources, and the footer disclaimer", async ({ page }) => {
  await page.goto("/tips");
  await expect(page.getByRole("heading", { name: "Tax Tips" })).toBeVisible();

  await page.getByRole("link", { name: "Claiming Work-Related Expenses as a Contractor" }).click();
  await page.waitForURL(`/tips/${SLUG}`);

  await expect(page.getByText("FY2025-26", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reviewed:/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources & further reading" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ATO — Deductions you can claim" })).toHaveAttribute(
    "href",
    "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim",
  );

  // Scoped to <main>: the article layout (tips/[slug]/layout.tsx) structurally guarantees its
  // own disclaimer around the article body, separate from the site-wide footer one in
  // (marketing)/layout.tsx - both legitimately render on this page.
  await expect(page.getByRole("main").getByText(/general and educational only/)).toBeVisible();
});
